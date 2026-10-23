export const IPC = {
  listWindows: 'windows:list',
  streamTarget: 'stream:target',
  toolsList: 'tools:list',
  permissions: 'app:permissions',
  agentStart: 'agent:start',
  agentStop: 'agent:stop',
  agentPause: 'agent:pause',
  agentResume: 'agent:resume',
  agentStatus: 'agent:status',
  agentEvent: 'agent:event',
  runsList: 'runs:list',
  runsRead: 'runs:read',
  runsShot: 'runs:shot',
  runsOpenDir: 'runs:open',
} as const

export const GRID = {
  minor: 10,
  major: 100,
} as const

/**
 * 小窗口按 100px 画主格只剩一两条线，模型只能靠数刻度估坐标；
 * 长边不到 640 时改用 50px 主格，锚点翻倍。
 */
export function gridMajor(longEdge: number): number {
  return longEdge < 640 ? 50 : GRID.major
}

/**
 * 预览（SVG）和发给模型的截图（canvas）各画一遍网格，
 * 样式参数集中在这里，免得两边各写一套慢慢长歪。
 */
export const GRID_STYLE = {
  line: 'rgba(255, 82, 82, 0.45)',
  tick: 'rgba(255, 82, 82, 0.7)',
  label: '#ff8a80',
  labelStroke: 'rgba(0, 0, 0, 0.85)',
  labelStrokeWidth: 3,
  majorTick: 10,
  minorTick: 4,
  dash: [4, 4],
} as const
