import { clockText, durationText } from '../../../src/shared/time'
import type { ToolDef } from './types'
import { requireString } from './helpers'
import { waitUntil } from './wait-runner'

/** 刚过点一分钟内仍算到点，给模型留出往返延迟 */
const GRACE_MS = 60_000

interface Clock {
  hours: number
  minutes: number
  seconds: number
}

function parseClock(raw: string): Clock | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw.trim())
  if (!match) return null
  const clock = {
    hours: Number(match[1]),
    minutes: Number(match[2]),
    seconds: Number(match[3] ?? 0),
  }
  if (clock.hours > 23 || clock.minutes > 59 || clock.seconds > 59) return null
  return clock
}

export const waitUntilTool: ToolDef = {
  name: 'wait_until',
  description:
    '等到本地时间的某个时刻再继续。at 写成 "HH:mm" 或 "HH:mm:ss"（24 小时制），例如 "17:01" 表示今天 17:01；已经到点会直接返回。',
  parameters: {
    type: 'object',
    properties: {
      at: { type: 'string', description: '目标时刻，如 17:01 或 17:01:00' },
    },
    required: ['at'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const at = requireString(input, 'at')
    const clock = parseClock(at)
    if (!clock) {
      throw new Error(`时间格式不正确：${at}，请用 HH:mm 或 HH:mm:ss`)
    }

    const target = new Date()
    target.setHours(clock.hours, clock.minutes, clock.seconds, 0)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    // 更早的时刻直接报错并给出当前时间，避免模型把「等到明天」算成一次长睡
    if (diff < -GRACE_MS) {
      throw new Error(`目标时间 ${at} 已经过去（当前 ${clockText(now)}），请确认要等到哪个时刻`)
    }
    if (diff <= 0) {
      return { text: `已经到 ${clockText(target)}，无需等待` }
    }

    const elapsed = await waitUntil(context, target.getTime())
    if (context.signal.aborted) {
      return { text: `等待被终止，已等 ${durationText(elapsed)}` }
    }
    return { text: `已等到 ${clockText(target)}` }
  },
}
