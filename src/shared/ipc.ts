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
