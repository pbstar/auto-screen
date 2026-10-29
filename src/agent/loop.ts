import { MAX_STEPS, type AgentRunReason, type ReasoningEffort } from '../shared/agent'
import type { ToolContext } from '../shared/types'
import { captureWindow } from '../core/screen'
import { annotateCapture, type AnnotatedShot } from './annotate'
import { appendShot, truncate } from './history'
import {
  addUsage,
  assistantMessage,
  chat,
  describeError,
  isAbortError,
  parseArguments,
  type ToolCall,
} from './llm'
import { executeTool, listToolSchemas, type ToolDef } from './tools'
import { countsAsEffect, judgeEffect } from './effect'
import { isScriptTool } from './scripts'
import { markOf } from './mark'
import { planTask } from './plan'
import { verifyResult } from './verify'
import { createContext, type RunContext, type RunOptions, type RunOutcome } from './run-context'

/** 动作执行后界面未必立刻重绘，截图前留一点时间，免得模型读到旧画面 */
const SETTLE_MS = 150
/** 会移动鼠标或敲键盘的工具，执行期间暂停人工接管检测 */
const INPUT_TOOLS = new Set(['click', 'move', 'drag', 'scroll', 'type', 'key'])
/** 核对连续两次不通过就收尾：结果没被确认，不能当作完成 */
const MAX_VERIFY_FAILURES = 2

/** 脚本内部同样在动鼠标键盘：按同一套输入工具对待 */
function movesInput(name: string): boolean {
  return INPUT_TOOLS.has(name) || isScriptTool(name)
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const HEAVY_EFFORT: ReasoningEffort = 'high'
export const ROUTINE_EFFORT: ReasoningEffort = 'low'

export async function runAgent(options: RunOptions): Promise<RunOutcome> {
  const startedAt = Date.now()
  const ctx = createContext(options)
  let reason: AgentRunReason = 'max_steps'
  let error: string | undefined

  ctx.emit({ type: 'started', task: options.task, maxSteps: MAX_STEPS })
  try {
    await preparePlan(ctx)
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

/** 开始前先定流程：注入一条 user 消息，之后所有步骤共享这段前缀，缓存不受影响 */
async function preparePlan(ctx: RunContext): Promise<void> {
  const { plan, usage } = await planTask({
    windowId: ctx.windowId,
    task: ctx.task,
    signal: ctx.signal,
  })
  ctx.usage = addUsage(ctx.usage, usage)
  ctx.emit({ type: 'usage', usage: ctx.usage, effort: HEAVY_EFFORT })
  if (!plan) return
  ctx.plan = plan
  ctx.messages.push({
    role: 'user',
    content:
      `已定流程（照此执行；每步仍用新截图核对，画面与流程不符时以画面为准并自行调整）：\n${plan}`,
  })
  ctx.emit({ type: 'plan', text: plan })
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
  // 规划已经替首步想过；执行步只在工具失败后需要重新推演
  const effort = ctx.failed ? HEAVY_EFFORT : ROUTINE_EFFORT
  ctx.failed = false
  const shot = await annotateCapture(captureWindow(ctx.windowId), ctx.mark)
  // 上一步动作到这一步截图之间画面没变，就说明那个动作没生效；必须先判断再存新签名
  const effect = judgeEffect(ctx.prevFrame, shot.frame, ctx.lastAction, ctx.noEffect)
  ctx.prevFrame = shot.frame
  ctx.lastAction = null
  ctx.noEffect = effect.streak
  if (effect.escalate) ctx.failed = true
  ctx.saveShot(step, shot.dataUrl)
  ctx.emit({
    type: 'shot',
    step,
    image: shot.thumb,
    width: shot.width,
    height: shot.height,
    note: effect.note ?? undefined,
  })
  if (effect.abort) {
    ctx.error = effect.abort
    return 'failed'
  }
  appendShot(ctx.messages, ctx.shots, shot, step, effect.note ?? undefined)

  const turn = await chat({
    messages: ctx.messages,
    signal: ctx.signal,
    maxTokens: 8192,
    tools: listToolSchemas(ctx.scriptTools),
    effort,
  })
  ctx.usage = addUsage(ctx.usage, turn.usage)
  ctx.emit({ type: 'usage', usage: ctx.usage, effort })
  ctx.messages.push(assistantMessage(turn))
  if (turn.content) {
    ctx.lastText = turn.content
    ctx.emit({ type: 'reply', step, text: turn.content })
  }

  if (turn.toolCalls.length === 0) return finishStep(ctx, shot, step, turn.content)
  return runToolCalls(ctx, turn.toolCalls, shot, step)
}

/**
 * 模型宣布完成：先对着任务要求核对最后一张截图。
 * 不通过就把差距回灌让它继续修；连续两次不通过，以 unverified 收尾。
 */
async function finishStep(
  ctx: RunContext,
  shot: AnnotatedShot,
  step: number,
  claim: string | null,
): Promise<AgentRunReason | null> {
  const { verdict, usage } = await verifyResult({
    task: ctx.task,
    plan: ctx.plan,
    claim,
    image: shot.dataUrl,
    signal: ctx.signal,
  })
  ctx.usage = addUsage(ctx.usage, usage)
  ctx.emit({ type: 'usage', usage: ctx.usage, effort: HEAVY_EFFORT })
  // 解析不出结论时按通过处理：格式问题不该把任务判失败
  if (!verdict) return 'completed'
  ctx.emit({ type: 'verify', step, ok: verdict.ok, problem: verdict.problem })
  if (verdict.ok) return 'completed'

  const problem = verdict.problem || '结果与任务要求不符'
  ctx.verifyFailures += 1
  if (ctx.verifyFailures >= MAX_VERIFY_FAILURES) {
    ctx.error = `最终核对未通过：${problem}`
    return 'unverified'
  }
  // 模型刚以为自己做完了，下一步要推翻这个判断，值得多想
  ctx.failed = true
  ctx.messages.push({
    role: 'user',
    content: `最终核对未通过：${problem}\n请按任务要求继续修正，改完再说明结果。`,
  })
  return null
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
      report: (text) =>
        ctx.emit({
          type: 'tool_progress',
          step,
          callId: call.id,
          text,
          script: isScriptTool(call.function.name) || undefined,
        }),
      baseline: shot.frame,
      ask: (input) => ctx.ask({ ...input, callId: call.id, step }),
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

  const outcome = await withBusy(ctx, name, () => invokeTool(name, input, context, ctx.scriptTools))
  if (movesInput(name)) ctx.dirty = true
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
    if (countsAsEffect(name, input)) ctx.lastAction = name
    const mark = markOf(name, input, context)
    if (mark) ctx.mark = mark
  }
  return { ...outcome, input }
}

/** 鼠标键盘由 Agent 自己动的时候，按住接管检测，避免误判 */
async function withBusy<T>(ctx: RunContext, name: string, action: () => Promise<T>): Promise<T> {
  if (!movesInput(name)) return action()
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
  scripts: ToolDef[],
): Promise<{ text: string; isError: boolean }> {
  try {
    const result = await executeTool(name, input, context, scripts)
    return { text: truncate(result.text), isError: false }
  } catch (caught) {
    // 终止时不要把中断伪装成工具失败，交给外层按 stopped 收敛
    if (isAbortError(caught)) throw caught
    return { text: truncate(describeError(caught)), isError: true }
  }
}
