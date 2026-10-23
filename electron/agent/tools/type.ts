import { typeText } from '../../../src/core/input'
import type { ToolDef } from './types'
import { requireString } from './helpers'

export const typeTool: ToolDef = {
  name: 'type',
  description: '在当前焦点位置输入文本。执行前应先用 click 让目标输入框获得焦点。',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '要输入的文本，支持中文' },
    },
    required: ['text'],
    additionalProperties: false,
  },
  async execute(input) {
    const text = requireString(input, 'text')
    await typeText(text)
    return { text: `已输入 ${text.length} 个字符` }
  },
}
