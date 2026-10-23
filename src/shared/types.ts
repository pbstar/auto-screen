export interface MonitorInfo {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
  isPrimary: boolean
}

export interface WindowInfo {
  id: number
  pid: number
  appName: string
  title: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
  isFocused: boolean
  monitor: MonitorInfo
}

export interface CaptureResult {
  /** PNG data URL */
  image: string
  /** 截图物理像素宽 */
  width: number
  /** 截图物理像素高 */
  height: number
  window: WindowInfo
}

export type MouseButton = 'left' | 'right'
export type UnitMode = 'auto' | 'physical' | 'logical'

export interface ClickRequest {
  windowId: number
  imageWidth: number
  imageHeight: number
  x: number
  y: number
  button?: MouseButton
  count?: number
  unitMode?: UnitMode
  hideWindow?: boolean
}

export interface ClickResult {
  x: number
  y: number
  unit: 'physical' | 'logical'
}

export interface TypeRequest {
  text: string
  click?: ClickRequest
  hideWindow?: boolean
}

export interface KeyRequest {
  combo: string
  hideWindow?: boolean
}

export interface PermissionStatus {
  platform: string
  screen: string
  accessibility: boolean
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface AutoScreenApi {
  listWindows(): Promise<IpcResult<WindowInfo[]>>
  capture(windowId: number): Promise<IpcResult<CaptureResult>>
  click(request: ClickRequest): Promise<IpcResult<ClickResult>>
  typeText(request: TypeRequest): Promise<IpcResult<null>>
  pressKey(request: KeyRequest): Promise<IpcResult<null>>
  copyText(text: string): Promise<IpcResult<null>>
  permissions(): Promise<IpcResult<PermissionStatus>>
}
