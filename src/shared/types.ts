import type { AgentEvent, AgentStartRequest, AgentStatus } from './agent'

/** 窗口列表只给界面用来认出目标，坐标换算在 core/screen.ts 内部完成 */
export interface WindowInfo {
  id: number
  appName: string
  title: string
  width: number
  height: number
}

export interface CaptureResult {
  /** PNG data URL */
  image: string
  /** 截图物理像素宽 */
  width: number
  /** 截图物理像素高 */
  height: number
}

export type ScrollDirection = 'up' | 'down'

export interface ToolContext {
  windowId: number
  /** 当前截图宽高，工具坐标一律以它为准 */
  imageWidth: number
  imageHeight: number
  /** 终止时立刻中断，长等待不用等满 */
  signal: AbortSignal
}

export interface ToolResult {
  /** 回填给模型并显示在时间线；失败一律抛错，由调用方统一收敛 */
  text: string
}

/** 界面展示用的工具条目，不含 JSON Schema */
export interface ToolSummary {
  name: string
  description: string
}

export interface PermissionStatus {
  platform: string
  screen: string
  accessibility: boolean
}

/** 一次运行在磁盘上的记录 */
export interface RunMeta {
  /** 运行目录名，读取日志时作为标识 */
  name: string
  runId: string
  task: string
  startedAt: number
  endedAt: number | null
  reason: string | null
}

export interface RunLog {
  meta: RunMeta | null
  text: string
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface AutoScreenApi {
  listWindows(): Promise<IpcResult<WindowInfo[]>>
  /** 设置 getDisplayMedia 要捕获的窗口，返回系统是否提供了画面源 */
  setStreamTarget(windowId: number | null): Promise<IpcResult<boolean>>
  listTools(): Promise<IpcResult<ToolSummary[]>>
  permissions(): Promise<IpcResult<PermissionStatus>>
  startAgent(request: AgentStartRequest): Promise<IpcResult<null>>
  stopAgent(): Promise<IpcResult<null>>
  pauseAgent(): Promise<IpcResult<null>>
  resumeAgent(): Promise<IpcResult<null>>
  agentStatus(): Promise<IpcResult<AgentStatus>>
  /** 返回取消订阅函数 */
  onAgentEvent(listener: (event: AgentEvent) => void): () => void
  listRuns(): Promise<IpcResult<RunMeta[]>>
  readRun(name: string): Promise<IpcResult<RunLog>>
  /** 按运行读取原始标注截图（data URL），失败时界面退回缩略图 */
  readRunShot(runId: string, step: number): Promise<IpcResult<string | null>>
  openRunsDir(): Promise<IpcResult<null>>
}
