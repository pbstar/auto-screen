import type { TokenUsage } from '../shared/agent'
import { captureWindow } from '../core/screen'
import { annotateCapture } from './annotate'
import { chat } from './llm'
import { PLAN_PROMPT } from './prompts/plan'

const MAX_PLAN = 1_000

interface PlanInput {
  windowId: number
  task: string
  signal: AbortSignal
}

interface PlanResult {
  /** 模型给出的流程；空回复时为 null，后续步骤照常执行 */
  plan: string | null
  usage: TokenUsage
}

/**
 * 开始前先定流程：一次不带工具的高思考调用，看当前画面给出步骤与完成标准。
 * 后面的执行步带着这份流程办事，不再每步重新推演。
 */
export async function planTask(input: PlanInput): Promise<PlanResult> {
  const shot = await annotateCapture(captureWindow(input.windowId))
  const reply = await chat({
    messages: [
      { role: 'system', content: PLAN_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: `任务：${input.task}\n这是当前画面，先定流程。` },
          { type: 'image_url', image_url: { url: shot.dataUrl, detail: 'high' } },
        ],
      },
    ],
    signal: input.signal,
    maxTokens: 1024,
    effort: 'high',
  })
  const plan = (reply.content ?? '').trim().slice(0, MAX_PLAN)
  return { plan: plan || null, usage: reply.usage }
}
