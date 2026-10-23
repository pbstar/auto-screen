import { listWindows } from '../../../src/core/screen'
import type { ToolDef } from './types'

export const listWindowsTool: ToolDef = {
  name: 'list_windows',
  description:
    '列出当前可操作的桌面窗口（应用名、标题、尺寸）。用于确认目标窗口是否存在，不需要坐标。',
  parameters: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    const windows = listWindows(process.pid)
    if (windows.length === 0) {
      return { text: '当前没有可操作的窗口' }
    }
    const lines = windows.map(
      (win, index) =>
        `${index + 1}. ${win.appName} · ${win.title || '无标题'}（${win.width}×${win.height}）`,
    )
    return { text: lines.join('\n') }
  },
}
