import { moveAt } from '../../../src/core/input'
import { findWindow, imageToPhysical, windowScaleFactor } from '../../../src/core/screen'
import type { ToolDef } from './types'
import { gridValue, requireNumber } from './helpers'

export const moveTool: ToolDef = {
  name: 'move',
  description:
    '把鼠标移到截图坐标 (x, y)，不点击。用于悬停展开菜单或触发提示。坐标以截图左上角为原点，必须是 10 的倍数。',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: '截图坐标 x' },
      y: { type: 'number', description: '截图坐标 y' },
    },
    required: ['x', 'y'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const x = gridValue(requireNumber(input, 'x'), context.imageWidth)
    const y = gridValue(requireNumber(input, 'y'), context.imageHeight)

    const win = findWindow(context.windowId)
    const point = imageToPhysical(win, context.imageWidth, context.imageHeight, x, y)
    await moveAt(point, windowScaleFactor(win), context.unitMode ?? 'auto')

    return { text: `已移动到 (${x}, ${y})` }
  },
}
