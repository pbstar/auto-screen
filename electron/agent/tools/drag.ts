import { dragAt } from '../../../src/core/input'
import { findWindow, imageToPhysical, windowScaleFactor } from '../../../src/core/screen'
import { snapToGrid } from '../../../src/shared/grid'
import type { ToolDef } from './types'
import { requireNumber } from './helpers'

export const dragTool: ToolDef = {
  name: 'drag',
  description: '按住鼠标左键，从截图坐标 (fromX, fromY) 拖到 (toX, toY)。坐标必须是 10 的倍数。',
  parameters: {
    type: 'object',
    properties: {
      fromX: { type: 'number', description: '起点 x' },
      fromY: { type: 'number', description: '起点 y' },
      toX: { type: 'number', description: '终点 x' },
      toY: { type: 'number', description: '终点 y' },
    },
    required: ['fromX', 'fromY', 'toX', 'toY'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const fromX = snapToGrid(requireNumber(input, 'fromX'), context.imageWidth)
    const fromY = snapToGrid(requireNumber(input, 'fromY'), context.imageHeight)
    const toX = snapToGrid(requireNumber(input, 'toX'), context.imageWidth)
    const toY = snapToGrid(requireNumber(input, 'toY'), context.imageHeight)

    const win = findWindow(context.windowId)
    const from = imageToPhysical(win, context.imageWidth, context.imageHeight, fromX, fromY)
    const to = imageToPhysical(win, context.imageWidth, context.imageHeight, toX, toY)
    await dragAt(from, to, windowScaleFactor(win))

    return { text: `已拖拽 (${fromX}, ${fromY}) → (${toX}, ${toY})` }
  },
}
