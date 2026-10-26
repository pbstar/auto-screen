import { loadImage } from '@napi-rs/canvas'
import { captureWindow } from '../../../src/core/screen'
import { durationText } from '../../../src/shared/time'
import type { FrameSignature, ToolContext } from '../../../src/shared/types'
import { framesDiffer, sampleFrame } from '../watch'
import type { ToolDef } from './types'
import { optionalNumber } from './helpers'
import { PROGRESS_MS, sleepOrAbort } from './wait-runner'

const DEFAULT_TIMEOUT_MS = 120_000
const MAX_TIMEOUT_MS = 3_600_000
const TICK_MS = 1_000
/** 检测到变化后再看一小段时间，等动画收尾 */
const SETTLE_MS = 800
const SETTLE_TICK_MS = 250

async function readFrame(windowId: number): Promise<FrameSignature> {
  const capture = captureWindow(windowId)
  const png = Buffer.from(capture.image.split(',')[1] ?? '', 'base64')
  return sampleFrame(await loadImage(png))
}
/** 画面刚变化时可能还在动画中，等它连续两帧一致再交给模型 */
async function settle(context: ToolContext, first: FrameSignature): Promise<void> {
  const deadline = Date.now() + SETTLE_MS
  let previous = first
  while (Date.now() < deadline && !context.signal.aborted) {
    if (context.gate.paused) {
      await context.gate.wait(context.signal)
      continue
    }
    await sleepOrAbort(SETTLE_TICK_MS, context.signal)
    if (context.signal.aborted) return
    const frame = await readFrame(context.windowId)
    if (!framesDiffer(previous, frame)) return
    previous = frame
  }
}

export const waitForChangeTool: ToolDef = {
  name: 'wait_for_change',
  description:
    '等待目标窗口的画面发生变化再继续，变化后自动返回。用于等对手操作、等页面刷新、等状态更新，' +
    `不要用一串 wait 自己轮询。timeoutMs 默认 ${DEFAULT_TIMEOUT_MS}，最多 ${MAX_TIMEOUT_MS}；` +
    '连续超时说明外界没有动作，把情况告诉用户，不要无限等待。',
  parameters: {
    type: 'object',
    properties: {
      timeoutMs: {
        type: 'integer',
        minimum: 1000,
        maximum: MAX_TIMEOUT_MS,
        description: `最多等多久，默认 ${DEFAULT_TIMEOUT_MS}`,
      },
    },
    additionalProperties: false,
  },
  async execute(input, context) {
    const timeoutMs =
      optionalNumber(input, 'timeoutMs', { min: 1000, max: MAX_TIMEOUT_MS, integer: true }) ??
      DEFAULT_TIMEOUT_MS
    const baseline = context.baseline
    if (!baseline) throw new Error('缺少基准截图，无法判断画面变化')

    let elapsed = 0
    let nextReport = PROGRESS_MS
    while (elapsed < timeoutMs && !context.signal.aborted) {
      if (context.gate.paused) {
        await context.gate.wait(context.signal)
        continue
      }
      // 先看一眼再睡：对手可能在模型思考的两三秒里已经落子了
      const tickStart = Date.now()
      const frame = await readFrame(context.windowId)
      elapsed += Date.now() - tickStart
      if (framesDiffer(baseline, frame)) {
        await settle(context, frame)
        return { text: `画面在第 ${durationText(elapsed)} 发生变化` }
      }
      elapsed += await sleepOrAbort(Math.min(TICK_MS, timeoutMs - elapsed), context.signal)
      if (elapsed >= nextReport) {
        context.report?.(`已等待 ${durationText(elapsed)} / ${durationText(timeoutMs)}`)
        nextReport += PROGRESS_MS
      }
    }

    if (context.signal.aborted) {
      return { text: `等待被终止，已等 ${durationText(elapsed)}` }
    }
    return { text: `等满 ${durationText(timeoutMs)}，画面没有变化` }
  },
}
