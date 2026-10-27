import { snapToGrid } from '../../src/shared/grid'
import type { ToolContext } from '../../src/shared/types'
import type { ClickMark } from './annotate'

/** 只有指针动作的落点值得回显，键盘和滚动没有落点 */
const MARK_TOOLS = new Set(['click', 'move', 'drag'])

/** 把工具参数里的落点换算成截图坐标，和工具内部的对齐规则保持一致 */
export function markOf(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): ClickMark | null {
  if (!MARK_TOOLS.has(name)) return null
  const dragging = name === 'drag'
  const x = Number(dragging ? input.toX : input.x)
  const y = Number(dragging ? input.toY : input.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return {
    x: snapToGrid(x, context.imageWidth),
    y: snapToGrid(y, context.imageHeight),
  }
}
