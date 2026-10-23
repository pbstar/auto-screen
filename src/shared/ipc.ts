export const IPC = {
  listWindows: 'windows:list',
  streamTarget: 'stream:target',
  toolsList: 'tools:list',
  permissions: 'app:permissions',
  agentStart: 'agent:start',
  agentStop: 'agent:stop',
  agentStatus: 'agent:status',
  agentEvent: 'agent:event',
} as const

export const GRID = {
  minor: 10,
  major: 100,
} as const
