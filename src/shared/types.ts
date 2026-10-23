import type { AgentEvent, AgentStartRequest, AgentStatus } from './agent'

export interface MonitorInfo {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
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
export type ScrollDirection = 'up' | 'down'

export interface ToolContext {
  windowId: number
  imageWidth: number
  imageHeight: number
  unitMode?: UnitMode
}

export interface ToolResult {
  text: string
  data?: unknown
  image?: string
  isError?: boolean
}

export interface ToolExecuteRequest {
  name: string
  input: Record<string, unknown>
  context: ToolContext
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
  executeTool(request: ToolExecuteRequest): Promise<IpcResult<ToolResult>>
  copyText(text: string): Promise<IpcResult<null>>
  permissions(): Promise<IpcResult<PermissionStatus>>
  startAgent(request: AgentStartRequest): Promise<IpcResult<null>>
  stopAgent(): Promise<IpcResult<null>>
  agentStatus(): Promise<IpcResult<AgentStatus>>
  /** 返回取消订阅函数 */
  onAgentEvent(listener: (event: AgentEvent) => void): () => void
}
