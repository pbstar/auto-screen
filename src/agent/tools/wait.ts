import { durationText } from '../../shared/time'
import type { ToolDef } from './types'
import { requireNumber } from './helpers'
import { waitFor } from './wait-runner'

/** 技能里最长会写「等一个小时」；再长的等待该由定时任务承担，不该占着一次运行 */
const MAX_WAIT_MS = 3_600_000

export const waitTool: ToolDef = {
  name: 'wait',
  description: `等待一段时间再继续。单位毫秒，最多 ${MAX_WAIT_MS}（1 小时）；等待期间可以暂停或终止。`,
  parameters: {
    type: 'object',
    properties: {
      ms: { type: 'integer', minimum: 0, maximum: MAX_WAIT_MS, description: '等待毫秒数' },
    },
    required: ['ms'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const ms = requireNumber(input, 'ms', { min: 0, integer: true })
    // 超过上限直接报错，不静默裁剪，否则模型会以为等够了
    if (ms > MAX_WAIT_MS) {
      throw new Error(`等待时长最多 ${MAX_WAIT_MS} 毫秒（1 小时）`)
    }
    const elapsed = await waitFor(context, ms)
    const spent = durationText(elapsed)
    return {
      text: context.signal.aborted ? `等待被终止，已等 ${spent}` : `已等待 ${spent}`,
    }
  },
}
