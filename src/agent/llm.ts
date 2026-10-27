import OpenAI from 'openai'
import type { ReasoningEffort, TokenUsage } from '../shared/agent'
import { readModelConfig, type ModelConfig } from '../main/config'

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'high' } }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** Agent 自己的消息模型，避免 OpenAI SDK 的严格类型渗透到循环里 */
export type AgentMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | {
      role: 'assistant'
      content: string | null
      reasoning_content?: string
      tool_calls?: ToolCall[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface AssistantTurn {
  content: string | null
  reasoning: string | null
  toolCalls: ToolCall[]
  usage: TokenUsage
}

type ChatParams = Parameters<OpenAI['chat']['completions']['create']>[0]

let cached: { apiKey: string; baseUrl: string; sdk: OpenAI } | null = null

function getClient(cfg: ModelConfig): OpenAI {
  if (!cached || cached.apiKey !== cfg.apiKey || cached.baseUrl !== cfg.baseUrl) {
    cached = {
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      sdk: new OpenAI({
        apiKey: cfg.apiKey,
        baseURL: cfg.baseUrl,
        maxRetries: 1,
        timeout: 120_000,
      }),
    }
  }
  return cached.sdk
}

/** 工具定义由调用方传入：只有执行步需要，规划和核对不带工具 */
export interface ToolSchema {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export interface ChatRequest {
  messages: AgentMessage[]
  signal: AbortSignal
  maxTokens: number
  /** 带上工具就是执行步，不带就是一次性的文本任务 */
  tools?: ToolSchema[]
  /** 有值才开思考 */
  effort?: ReasoningEffort
}

/**
 * 所有模型请求的唯一入口。thinking / reasoning_effort 是 DeepSeek 的扩展参数，
 * OpenAI SDK 类型里没有，只在这里做一次断言，其它模块只面对 AgentMessage。
 */
export async function chat(request: ChatRequest): Promise<AssistantTurn> {
  const cfg = readModelConfig()
  const params = {
    model: cfg.model,
    messages: request.messages,
    max_tokens: request.maxTokens,
    ...(request.tools ? { tools: request.tools, tool_choice: 'auto' } : {}),
    ...(request.effort
      ? { thinking: { type: 'enabled' }, reasoning_effort: request.effort }
      : {}),
  } as unknown as ChatParams

  const completion = await getClient(cfg).chat.completions.create(params, {
    signal: request.signal,
  })
  if (!('choices' in completion)) {
    throw new Error('模型返回了流式响应，当前只发送非流式请求')
  }
  const message = completion.choices[0]?.message
  if (!message) {
    throw new Error('模型没有返回消息')
  }

  const extra = message as typeof message & { reasoning_content?: string }
  return {
    content: message.content ?? null,
    reasoning: extra.reasoning_content ?? null,
    toolCalls: (message.tool_calls ?? []) as ToolCall[],
    usage: readUsage(completion.usage),
  }
}

/** prompt_cache_hit_tokens 是 DeepSeek 的扩展字段，SDK 类型里没有 */
function readUsage(
  usage:
    | {
        prompt_tokens?: number
        completion_tokens?: number
        prompt_cache_hit_tokens?: number
      }
    | undefined,
): TokenUsage {
  return {
    prompt: usage?.prompt_tokens ?? 0,
    completion: usage?.completion_tokens ?? 0,
    cached: usage?.prompt_cache_hit_tokens ?? 0,
  }
}

/** assistant 消息必须原样带回 reasoning_content，缺了 DeepSeek 会返回 400 */
export function assistantMessage(turn: AssistantTurn): AgentMessage {
  return {
    role: 'assistant',
    content: turn.content,
    ...(turn.reasoning ? { reasoning_content: turn.reasoning } : {}),
    ...(turn.toolCalls.length > 0 ? { tool_calls: turn.toolCalls } : {}),
  }
}

/** 参数是模型给的 JSON 字符串，解析失败按空对象处理，缺参由工具自己报 */
export function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function addUsage(total: TokenUsage, delta: TokenUsage): TokenUsage {
  return {
    prompt: total.prompt + delta.prompt,
    completion: total.completion + delta.completion,
    cached: total.cached + delta.cached,
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIUserAbortError ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export function describeError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) return '模型接口鉴权失败，请检查 DEEPSEEK_API_KEY'
    if (error.status === 402) return '模型账户余额不足'
    if (error.status === 429) return '模型请求过于频繁，请稍后再试'
    if (error.status === 400) return `模型接口参数错误：${error.message}`
    return `模型接口错误（${error.status}）：${error.message}`
  }
  return error instanceof Error ? error.message : String(error)
}
