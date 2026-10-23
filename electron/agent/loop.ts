import type { AgentEventPayload, AgentRunReason, TokenUsage } from '../../src/shared/agent'
import type { ToolContext } from '../../src/shared/types'
import { captureWindow } from '../../src/core/screen'
import { annotateCapture, type AnnotatedShot } from './annotate'
import { appendShot, truncate, type ShotRef } from './history'
import {
  describeError,
  isAbortError,
  requestAssistantTurn,
  type AgentMessage,
  type AssistantTurn,
  type ToolCall,
} from './llm'
import { buildSystemPrompt } from './prompt'
import { executeTool } from './registry'
import type { PauseGate } from './control'

export const MAX_STEPS = 30
const MAX_FAILURES = 3
const NO_HIDE = new Set(['wait', 'list_windows'])
/** 会移动鼠标或敲键盘的工具，执行期间暂停人工接管检测 */
const INPUT_TOOLS = new Set(['click', 'move', 'drag', 'scroll', 'type', 'key'])

type Emit = (payload: AgentEventPayload) => void
type Hide = <T>(hide: boolean, action: () => Promise<T>) => Promise<T>

export interface RunOptions {
  windowId: number
  task: string
  signal: AbortSignal
  emit: Emit
  hide: Hide
  /** 把标注后的完整截图落到运行记录里，供大图查看 */
  saveShot: (step: number, dataUrl: string) => void
  gate: PauseGate
  /** 标记鼠标键盘正在被 Agent 使用 */
  busy: (on: boolean) => void
}

export interface RunOutcome {
  reason: AgentRunReason
  text?: string
  error?: string
  steps: number
  usage: TokenUsage
  durationMs: number
}

interface RunContext {
  windowId: number
  signal: AbortSignal
  emit: Emit
  hide: Hide
  saveShot: (step: number, dataUrl: string) => void
  gate: PauseGate
  busy: (on: boolean) => void
  messages: AgentMessage[]
  shots: ShotRef[]
  usage: TokenUsage
  steps: number
  failures: number
  lastText: string | null
}

export async function runAgent(options: RunOptions): Promise<RunOutcome> {
  const startedAt = Date.now()
  const ctx = createContext(options)
  let reason: AgentRunReason = 'max_steps'
  let error: string | undefined

  ctx.emit({ type: 'started', task: options.task, maxSteps: MAX_STEPS })
  try {
    reason = await runLoop(ctx)
  } catch (caught) {
    if (isAbortError(caught)) {
      reason = 'stopped'
    } else {
      reason = 'failed'
      error = describeError(caught)
    }
  }

  return {
    reason,
    text: ctx.lastText ?? undefined,
    error,
    steps: ctx.steps,
    usage: ctx.usage,
    durationMs: Date.now() - startedAt,
  }
}

async function runLoop(ctx: RunContext): Promise<AgentRunReason> {
  while (ctx.steps < MAX_STEPS) {
    if (!(await waitWhilePaused(ctx))) return 'stopped'
    const outcome = await runStep(ctx, ctx.steps + 1)
    if (outcome) return outcome
  }
  return 'max_steps'
}

/** 暂停在步骤边界生效：挂起期间既不截图也不调模型 */
async function waitWhilePaused(ctx: RunContext): Promise<boolean> {
  await ctx.gate.wait(ctx.signal)
  return !ctx.signal.aborted
}

async function runStep(ctx: RunContext, step: number): Promise<AgentRunReason | null> {
  ctx.steps = step
  const shot = await annotateCapture(captureWindow(ctx.windowId))
  ctx.saveShot(step, shot.dataUrl)
  appendShot(ctx.messages, ctx.shots, shot, step)
  ctx.emit({ type: 'shot', step, image: shot.thumb, width: shot.width, height: shot.height })

  const turn = await requestAssistantTurn(ctx.messages, ctx.signal)
  ctx.usage = addUsage(ctx.usage, turn.usage)
  ctx.emit({ type: 'usage', usage: ctx.usage })
  ctx.messages.push(assistantMessage(turn))
  if (turn.content) {
    ctx.lastText = turn.content
    ctx.emit({ type: 'reply', step, text: turn.content })
  }

  if (turn.toolCalls.length === 0) return 'completed'
  return runToolCalls(ctx, turn.toolCalls, shot, step)
}

async function runToolCalls(
  ctx: RunContext,
  calls: ToolCall[],
  shot: AnnotatedShot,
  step: number,
): Promise<AgentRunReason | null> {
  const context: ToolContext = {
    windowId: ctx.windowId,
    imageWidth: shot.width,
    imageHeight: shot.height,
    unitMode: 'auto',
  }

  for (const call of calls) {
    if (!(await waitWhilePaused(ctx))) return 'stopped'
    const result = await runOneTool(ctx, call, context, step)
    ctx.failures = result.isError ? ctx.failures + 1 : 0
    if (ctx.failures >= MAX_FAILURES) return 'failed'
  }
  return null
}

async function runOneTool(
  ctx: RunContext,
  call: ToolCall,
  context: ToolContext,
  step: number,
): Promise<{ isError: boolean }> {
  const name = call.function.name
  const input = parseArguments(call.function.arguments)
  const startedAt = Date.now()
  ctx.emit({ type: 'tool_started', step, callId: call.id, name, input })

  const outcome = await withBusy(ctx, name, () => invokeTool(ctx, name, input, context))
  ctx.messages.push({ role: 'tool', tool_call_id: call.id, content: outcome.text })
  ctx.emit({
    type: 'tool_finished',
    step,
    callId: call.id,
    name,
    text: outcome.text,
    isError: outcome.isError,
    durationMs: Date.now() - startedAt,
  })
  return outcome
}

/** 鼠标键盘由 Agent 自己动的时候，按住接管检测，避免误判 */
async function withBusy<T>(ctx: RunContext, name: string, action: () => Promise<T>): Promise<T> {
  if (!INPUT_TOOLS.has(name)) return action()
  ctx.busy(true)
  try {
    return await action()
  } finally {
    ctx.busy(false)
  }
}

async function invokeTool(
  ctx: RunContext,
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): Promise<{ text: string; isError: boolean }> {
  const action = () => executeTool(name, input, context)
  try {
    const result = await (NO_HIDE.has(name) ? action() : ctx.hide(true, action))
    return { text: truncate(result.text), isError: Boolean(result.isError) }
  } catch (caught) {
    return { text: truncate(describeError(caught)), isError: true }
  }
}

function assistantMessage(turn: AssistantTurn): AgentMessage {
  return {
    role: 'assistant',
    content: turn.content,
    ...(turn.reasoning ? { reasoning_content: turn.reasoning } : {}),
    ...(turn.toolCalls.length > 0 ? { tool_calls: turn.toolCalls } : {}),
  }
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function addUsage(total: TokenUsage, delta: TokenUsage): TokenUsage {
  return {
    prompt: total.prompt + delta.prompt,
    completion: total.completion + delta.completion,
  }
}

function createContext(options: RunOptions): RunContext {
  return {
    windowId: options.windowId,
    signal: options.signal,
    emit: options.emit,
    hide: options.hide,
    saveShot: options.saveShot,
    gate: options.gate,
    busy: options.busy,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: options.task },
    ],
    shots: [],
    usage: { prompt: 0, completion: 0 },
    steps: 0,
    failures: 0,
    lastText: null,
  }
}
