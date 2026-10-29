import { snapToGrid } from '../shared/grid'
import { MAX_SCRIPT_MS, type ScriptStep } from '../shared/script'
import { durationText } from '../shared/time'
import type { FrameSignature, ToolContext } from '../shared/types'
import { readFrame } from './frame'
import { executeTool } from './tools'
import { sleepOrAbort } from './tools/wait-runner'
import { framesDiffer } from './watch'

/** 等画面变化的上限，steps 里可以按步覆盖 */
const DEFAULT_TIMEOUT_MS = 3_000
/** 轮询间隔：比模型的往返快一个数量级，又不至于把截图占满 */
const POLL_MS = 100
/** same 只在动作后很短一段时间内看：等太久会把「稍后自然刷新」也算成失败 */
const SETTLE_MS = 300
const ACTION_LABELS: Record<ScriptStep['action'], string> = {
  click: '点击',
  type: '输入',
  key: '按键',
  wait: '等待',
  wait_for_change: '等待画面变化',
}

/** 脚本被终止时按这个约定抛错，循环层据此按 stopped 收尾而不是当工具失败 */
export function abortError(): Error {
  const error = new Error('已终止')
  error.name = 'AbortError'
  return error
}

/** 逐步执行脚本：每步先报进度，再动作，最后按 expect 校验画面，任何一步不符就停 */
export async function runScriptSteps(steps: ScriptStep[], context: ToolContext): Promise<void> {
  const startedAt = Date.now()
  for (const [index, step] of steps.entries()) {
    if (context.signal.aborted) throw abortError()
    if (Date.now() - startedAt > MAX_SCRIPT_MS) {
      throw new Error(`脚本执行超过 ${durationText(MAX_SCRIPT_MS)}，已停止`)
    }
    // 暂停在步边界生效，与循环层一致
    await context.gate.wait(context.signal)
    if (context.signal.aborted) throw abortError()
    context.report?.(`第 ${index + 1}/${steps.length} 步：${describeStep(step, context)}`)
    await runStep(step, index, context)
  }
}

async function runStep(step: ScriptStep, index: number, context: ToolContext): Promise<void> {
  const expect = step.expect ?? 'any'
  const needChange = step.action === 'wait_for_change' || expect === 'change'
  const before = needChange || expect === 'same' ? await readFrame(context.windowId) : null
  if (step.action !== 'wait_for_change') {
    await apply(step, index, context)
    if (context.signal.aborted) throw abortError()
  }
  if (needChange && before) await untilChange(step, index, before, context)
  else if (expect === 'same' && before) await ensureSame(step, index, before, context)
}

/** 复用现有工具执行：坐标换算、网格对齐、落点回显都只有一份实现 */
async function apply(step: ScriptStep, index: number, context: ToolContext): Promise<void> {
  // 只在自己动手的这一下压住接管检测：步与步之间用户移动鼠标仍能触发暂停
  context.busy?.(true)
  try {
    await executeTool(step.action, stepInput(step, context), context)
  } catch (caught) {
    if (isAbort(caught)) throw caught
    const reason = caught instanceof Error ? caught.message : String(caught)
    throw stepError(step, index, `执行失败：${reason}`)
  } finally {
    context.busy?.(false)
  }
}

async function untilChange(
  step: ScriptStep,
  index: number,
  before: FrameSignature,
  context: ToolContext,
): Promise<void> {
  const timeoutMs = step.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (context.signal.aborted) throw abortError()
    if (context.gate.paused) {
      await context.gate.wait(context.signal)
      continue
    }
    if (framesDiffer(before, await readFrame(context.windowId))) return
    await sleepOrAbort(POLL_MS, context.signal)
  }
  throw stepError(step, index, `画面在 ${durationText(timeoutMs)} 内没有变化`)
}

async function ensureSame(
  step: ScriptStep,
  index: number,
  before: FrameSignature,
  context: ToolContext,
): Promise<void> {
  await sleepOrAbort(SETTLE_MS, context.signal)
  if (context.signal.aborted) throw abortError()
  if (framesDiffer(before, await readFrame(context.windowId))) {
    throw stepError(step, index, '画面发生了变化，但这一步预期不变')
  }
}

function stepInput(step: ScriptStep, context: ToolContext): Record<string, unknown> {
  switch (step.action) {
    case 'click': {
      // 归一化坐标乘截图宽高，网格对齐交给 click 工具，坐标只有一套换算
      const [nx, ny] = step.point ?? [0, 0]
      return { x: nx * context.imageWidth, y: ny * context.imageHeight }
    }
    case 'type':
      return { text: step.text ?? '' }
    case 'key':
      return { combo: step.combo ?? '' }
    case 'wait':
      return { ms: step.ms ?? 0 }
    default:
      return {}
  }
}

function labelOf(step: ScriptStep): string {
  return step.note ?? ACTION_LABELS[step.action]
}

/** 进度与日志都带上落点或参数：事后才能看清脚本到底点在哪、输入了什么 */
function describeStep(step: ScriptStep, context: ToolContext): string {
  const label = labelOf(step)
  const detail = actionDetail(step, context)
  return detail ? `${label} · ${detail}` : label
}

function actionDetail(step: ScriptStep, context: ToolContext): string {
  switch (step.action) {
    case 'click': {
      const [nx, ny] = step.point ?? [0, 0]
      const x = snapToGrid(nx * context.imageWidth, context.imageWidth)
      const y = snapToGrid(ny * context.imageHeight, context.imageHeight)
      return `点击 (${x}, ${y})`
    }
    case 'type':
      return `输入 ${preview(step.text ?? '')}`
    case 'key':
      return `按键 ${step.combo ?? ''}`
    case 'wait':
      return `等待 ${step.ms ?? 0}ms`
    default:
      return ''
  }
}

function preview(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > 20 ? `「${line.slice(0, 20)}…」` : `「${line}」`
}

function stepError(step: ScriptStep, index: number, reason: string): Error {
  return new Error(`第 ${index + 1} 步（${labelOf(step)}）${reason}，脚本已停止`)
}

function isAbort(caught: unknown): boolean {
  return caught instanceof Error && caught.name === 'AbortError'
}
