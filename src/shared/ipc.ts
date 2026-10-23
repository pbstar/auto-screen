export const IPC = {
  listWindows: 'windows:list',
  capture: 'screen:capture',
  executeTool: 'tools:execute',
  copyText: 'clipboard:write',
  permissions: 'app:permissions',
} as const

export const GRID = {
  minor: 10,
  major: 100,
} as const
