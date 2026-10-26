import { scrollAt } from '../../../src/core/input'
import { findWindow, imageToPhysical, windowScaleFactor } from '../../../src/core/screen'
import { snapToGrid } from '../../../src/shared/ipc'
import type { ToolDef } from './types'
import { optionalNumber, requireEnum, requireNumber } from './helpers'

export const scrollTool: ToolDef = {
  name: 'scroll',
  description:
    '把鼠标移到截图坐标 (x, y)，然后向上或向下滚动。滚动的“一格”由系统决定。',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: '滚动位置 x' },
      y: { type: 'number', description: '滚动位置 y' },
      direction: { type: 'string', enum: ['up', 'down'], description: '滚动方向' },
      amount: { type: 'integer', minimum: 1, maximum: 10, description: '滚动格数，默认 3' },
    },
    required: ['x', 'y', 'direction'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const x = snapToGrid(requireNumber(input, 'x'), context.imageWidth)
    const y = snapToGrid(requireNumber(input, 'y'), context.imageHeight)
    const direction = requireEnum(input, 'direction', ['up', 'down'] as const)
    const amount = optionalNumber(input, 'amount', { min: 1, max: 10, integer: true }) ?? 3

    const win = findWindow(context.windowId)
    const point = imageToPhysical(win, context.imageWidth, context.imageHeight, x, y)
    await scrollAt(point, windowScaleFactor(win), direction, amount)

    return { text: `已在 (${x}, ${y}) ${direction === 'up' ? '向上' : '向下'}滚动 ${amount} 格` }
  },
}
