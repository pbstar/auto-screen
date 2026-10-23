import { sleep } from '@nut-tree-fork/nut-js'
import type { ToolDef } from './types'
import { requireNumber } from './helpers'

export const waitTool: ToolDef = {
  name: 'wait',
  description: '等待一段时间，让界面完成响应。单位毫秒，最多 5000。',
  parameters: {
    type: 'object',
    properties: {
      ms: { type: 'integer', minimum: 0, maximum: 5000, description: '等待毫秒数' },
    },
    required: ['ms'],
    additionalProperties: false,
  },
  async execute(input) {
    const ms = requireNumber(input, 'ms', { min: 0, max: 5000, integer: true })
    await sleep(ms)
    return { text: `已等待 ${ms}ms` }
  },
}
