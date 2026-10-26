import { clockText } from '../../src/shared/time'
import type { AnnotatedShot } from './annotate'
import type { AgentMessage, ContentPart } from './llm'

const KEEP_IMAGES = 2

export interface ShotRef {
  index: number
  step: number
  width: number
  height: number
}

/**
 * 追加一张截图，只保留最近两张带图片的消息。
 * 更早的替换成一行确定性文字：既控制上下文长度，也不破坏 assistant / tool 的配对。
 */
export function appendShot(
  messages: AgentMessage[],
  shots: ShotRef[],
  shot: AnnotatedShot,
  step: number,
): void {
  const content: ContentPart[] = [
    {
      type: 'text',
      // 模型看不到时钟，按时刻行动（wait_until）或算间隔都要靠这里给的当前时间
      text: `第 ${step} 步截图，尺寸 ${shot.width}×${shot.height}，当前时间 ${clockText()}，坐标以这张图为准。`,
    },
    { type: 'image_url', image_url: { url: shot.dataUrl, detail: 'high' } },
  ]
  messages.push({ role: 'user', content })
  shots.push({ index: messages.length - 1, step, width: shot.width, height: shot.height })

  while (shots.length > KEEP_IMAGES) {
    const oldest = shots.shift()
    if (oldest) demote(messages, oldest)
  }
}

function demote(messages: AgentMessage[], ref: ShotRef): void {
  messages[ref.index] = {
    role: 'user',
    content: `[第 ${ref.step} 步截图已省略：${ref.width}×${ref.height}]`,
  }
}

export function truncate(text: string, max = 2000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
