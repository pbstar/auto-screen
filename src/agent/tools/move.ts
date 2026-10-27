import { moveAt } from '../../core/input'
import { findWindow, imageToPhysical, windowScaleFactor } from '../../core/screen'
import { snapToGrid } from '../../shared/grid'
import type { ToolDef } from './types'
import { requireNumber } from './helpers'

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
    const x = snapToGrid(requireNumber(input, 'x'), context.imageWidth)
    const y = snapToGrid(requireNumber(input, 'y'), context.imageHeight)

    const win = findWindow(context.windowId)
    const point = imageToPhysical(win, context.imageWidth, context.imageHeight, x, y)
    await moveAt(point, windowScaleFactor(win))

    return { text: `已移动到 (${x}, ${y})` }
  },
}
