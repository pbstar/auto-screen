export const IPC = {
  listWindows: 'windows:list',
  capture: 'screen:capture',
  click: 'input:click',
  typeText: 'input:type',
  pressKey: 'input:key',
  copyText: 'clipboard:write',
  permissions: 'app:permissions',
} as const

export const GRID = {
  minor: 10,
  major: 100,
} as const
