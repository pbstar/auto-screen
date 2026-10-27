import { clickAt } from '../../core/input'
import { findWindow, imageToPhysical, windowScaleFactor } from '../../core/screen'
import { snapToGrid } from '../../shared/grid'
import type { ToolDef } from './types'
import { optionalNumber, readEnum, requireNumber } from './helpers'

export const clickTool: ToolDef = {
  name: 'click',
  description:
    '在目标窗口的截图坐标 (x, y) 处点击。坐标以截图左上角为原点，必须是 10 的倍数。',
  parameters: {
    type: 'object',
    properties: {
      x: { type: 'number', description: '截图坐标 x' },
      y: { type: 'number', description: '截图坐标 y' },
      button: { type: 'string', enum: ['left', 'right'], description: '鼠标按键，默认 left' },
      count: { type: 'integer', minimum: 1, maximum: 2, description: '1 为单击，2 为双击' },
    },
    required: ['x', 'y'],
    additionalProperties: false,
  },
  async execute(input, context) {
    const x = snapToGrid(requireNumber(input, 'x'), context.imageWidth)
    const y = snapToGrid(requireNumber(input, 'y'), context.imageHeight)
    const button = readEnum(input, 'button', ['left', 'right'] as const, 'left')
    const count = optionalNumber(input, 'count', { min: 1, max: 2, integer: true }) ?? 1

    const win = findWindow(context.windowId)
    const point = imageToPhysical(win, context.imageWidth, context.imageHeight, x, y)
    const result = await clickAt(point, windowScaleFactor(win), button, count)

    const action = button === 'right' ? '右键' : count > 1 ? '双击' : '单击'
    return {
      text: `已${action} (${x}, ${y})，落点 (${result.x.toFixed(1)}, ${result.y.toFixed(1)})`,
    }
  },
}
