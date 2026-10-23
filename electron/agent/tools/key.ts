import { pressCombo } from '../../../src/core/input'
import type { ToolDef } from './types'
import { requireString } from './helpers'

export const keyTool: ToolDef = {
  name: 'key',
  description: '发送组合键。mod 在 macOS 表示 Cmd，在 Windows 表示 Ctrl，例如 mod+c。',
  parameters: {
    type: 'object',
    properties: {
      combo: { type: 'string', description: '组合键，如 mod+c、enter、escape、mod+shift+t' },
    },
    required: ['combo'],
    additionalProperties: false,
  },
  async execute(input) {
    const combo = requireString(input, 'combo')
    await pressCombo(combo)
    return { text: `已发送按键 ${combo}` }
  },
}
