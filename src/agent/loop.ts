import {
  EMPTY_USAGE,
  MAX_STEPS,
  type AgentEventPayload,
  type AgentRunReason,
  type ReasoningEffort,
  type TokenUsage,
} from '../shared/agent'
import type { ToolContext } from '../shared/types'
import { captureWindow } from '../core/screen'
import { annotateCapture, type AnnotatedShot, type ClickMark } from './annotate'
import { appendShot, truncate, type ShotRef } from './history'
import {
  addUsage,
  assistantMessage,
  describeError,
  isAbortError,
  parseArguments,
  requestAssistantTurn,
  type AgentMessage,
  type ToolCall,
} from './llm'
import { buildSystemPrompt, type RulePrompt, type SkillPrompt } from './prompt'
import { executeTool } from './tools'
import { markOf } from './mark'
import { FailureGuard, type PauseGate } from './control'

/** 动作执行后界面未必立刻重绘，截图前留一点时间，免得模型读到旧画面 */
const SETTLE_MS = 150
/** 会移动鼠标或敲键盘的工具，执行期间暂停人工接管检测 */
const INPUT_TOOLS = new Set(['click', 'move', 'drag', 'scroll', 'type', 'key'])

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const HEAVY_EFFORT: ReasoningEffort = 'high'
export const ROUTINE_EFFORT: ReasoningEffort = 'low'

type Emit = (payload: AgentEventPayload) => void

export interface RunOptions {
  windowId: number
  task: string
  /** 始终生效的规则，内置与自定义都在里面 */
  rules: RulePrompt[]
  /** 用户勾选的技能正文，直接拼进系统提示 */
  skills: SkillPrompt[]
  signal: AbortSignal
  emit: Emit
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
  saveShot: (step: number, dataUrl: string) => void
  gate: PauseGate
  guard: FailureGuard
  busy: (on: boolean) => void
  messages: AgentMessage[]
  shots: ShotRef[]
  usage: TokenUsage
  steps: number
  error?: string
  lastText: string | null
  mark: ClickMark | null
  /** 上一步是否动过鼠标键盘，没动过就不用等重绘 */
  dirty: boolean
  /** 上一步是否有工具失败，失败后的下一步需要重新想 */
  failed: boolean
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
    error: error ?? ctx.error,
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
  if (step > 1 && ctx.dirty) await delay(SETTLE_MS)
  ctx.dirty = false
  // 第 1 步要读全屏拆任务、出错后要换策略，这两处值得多想；常规步骤只做即时判断
  const effort = step === 1 || ctx.failed ? HEAVY_EFFORT : ROUTINE_EFFORT
  ctx.failed = false
  const shot = await annotateCapture(captureWindow(ctx.windowId), ctx.mark)
  ctx.saveShot(step, shot.dataUrl)
  appendShot(ctx.messages, ctx.shots, shot, step)
  ctx.emit({ type: 'shot', step, image: shot.thumb, width: shot.width, height: shot.height })

  const turn = await requestAssistantTurn(ctx.messages, ctx.signal, effort)
  ctx.usage = addUsage(ctx.usage, turn.usage)
  ctx.emit({ type: 'usage', usage: ctx.usage, effort })
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
  // 一批动作里前面某个失败了，后面的前提可能已经不成立，跳过并把原因回给模型
  let blocked = false
  for (const call of calls) {
    if (!(await waitWhilePaused(ctx))) return 'stopped'
    if (blocked) {
      ctx.messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: '未执行：同一批里前面的动作失败了，先看新截图再决定',
      })
      continue
    }
    // 工具上下文按调用构造：进度事件要带上 callId，界面才知道更新哪一条
    const context: ToolContext = {
      windowId: ctx.windowId,
      imageWidth: shot.width,
      imageHeight: shot.height,
      signal: ctx.signal,
      gate: ctx.gate,
      report: (text) => ctx.emit({ type: 'tool_progress', step, callId: call.id, text }),
      baseline: shot.frame,
    }
    const result = await runOneTool(ctx, call, context, step)
    const abort = ctx.guard.observe(call.function.name, result.input, result.text, result.isError)
    if (abort) {
      ctx.error = abort
      return 'failed'
    }
    blocked = result.isError
  }
  return null
}

async function runOneTool(
  ctx: RunContext,
  call: ToolCall,
  context: ToolContext,
  step: number,
): Promise<{ text: string; isError: boolean; input: Record<string, unknown> }> {
  const name = call.function.name
  const input = parseArguments(call.function.arguments)
  const startedAt = Date.now()
  ctx.emit({ type: 'tool_started', step, callId: call.id, name, input })

  const outcome = await withBusy(ctx, name, () => invokeTool(name, input, context))
  if (INPUT_TOOLS.has(name)) ctx.dirty = true
  if (outcome.isError) ctx.failed = true
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
  if (!outcome.isError) {
    const mark = markOf(name, input, context)
    if (mark) ctx.mark = mark
  }
  return { ...outcome, input }
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
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): Promise<{ text: string; isError: boolean }> {
  try {
    const result = await executeTool(name, input, context)
    return { text: truncate(result.text), isError: false }
  } catch (caught) {
    return { text: truncate(describeError(caught)), isError: true }
  }
}

function createContext(options: RunOptions): RunContext {
  return {
    windowId: options.windowId,
    signal: options.signal,
    emit: options.emit,
    saveShot: options.saveShot,
    gate: options.gate,
    guard: new FailureGuard(),
    busy: options.busy,
    messages: [
      { role: 'system', content: buildSystemPrompt(options.rules, options.skills) },
      { role: 'user', content: options.task },
    ],
    shots: [],
    usage: EMPTY_USAGE,
    steps: 0,
    lastText: null,
    mark: null,
    dirty: false,
    failed: false,
  }
}
