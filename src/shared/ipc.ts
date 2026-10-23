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
