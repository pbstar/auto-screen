import type {
  AgentAnswer,
  AgentEvent,
  AgentStartRequest,
  AgentStatus,
  AskOption,
  PauseReason,
} from './agent'

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

/** 暂停闸门在工具层的投影：长等待据此在暂停时停止推进 */
export interface PauseControl {
  readonly paused: PauseReason | null
  wait(signal: AbortSignal): Promise<void>
}

/** 一张截图的低分辨率灰度签名，用来判断画面有没有变化 */
export interface FrameSignature {
  cols: number
  rows: number
  /** 每块的平均灰度 0-255，按行优先排列 */
  blocks: Uint8Array
}

/** 给模型的提问参数，callId 与 step 由循环层补上 */
export interface AskInput {
  question: string
  options: AskOption[]
  multiple: boolean
}

export interface ToolContext {
  windowId: number
  /** 当前截图宽高，工具坐标一律以它为准 */
  imageWidth: number
  imageHeight: number
  /** 终止时立刻中断，长等待不用等满 */
  signal: AbortSignal
  gate: PauseControl
  /** 长任务定期回报进度，界面显示在时间线上；即时工具不用 */
  report?: (text: string) => void
  /** 本步模型看到的那张原始截图的签名，wait_for_change 以它为基准 */
  baseline?: FrameSignature
  /** 向用户提问并等待回答，返回 null 表示用户跳过；没有通道时不给 */
  ask?: (input: AskInput) => Promise<string | null>
  /** 标记鼠标键盘正在被 Agent 使用；脚本按步调用，步与步之间用户动鼠标仍会触发接管 */
  busy?: (on: boolean) => void
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

/** 一份技能就是一个目录下的 SKILL.md，id 即目录名 */
export interface SkillSummary {
  id: string
  name: string
  description: string
}

export interface PermissionStatus {
  platform: string
  screen: string
  accessibility: boolean
}

/** 界面展示的模型配置：Key 只回传脱敏提示，不回传明文 */
export interface ModelSettings {
  baseUrl: string
  model: string
  apiKeySet: boolean
  /** 形如 sk-***abcd，未配置时为空串 */
  apiKeyHint: string
}

export interface ModelSettingsInput {
  baseUrl: string
  model: string
  /** 留空表示沿用已保存的 Key */
  apiKey?: string
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
  listSkills(): Promise<IpcResult<SkillSummary[]>>
  permissions(): Promise<IpcResult<PermissionStatus>>
  getModelSettings(): Promise<IpcResult<ModelSettings>>
  saveModelSettings(input: ModelSettingsInput): Promise<IpcResult<ModelSettings>>
  startAgent(request: AgentStartRequest): Promise<IpcResult<null>>
  stopAgent(): Promise<IpcResult<null>>
  pauseAgent(): Promise<IpcResult<null>>
  resumeAgent(): Promise<IpcResult<null>>
  answerAgentQuestion(payload: AgentAnswer): Promise<IpcResult<null>>
  agentStatus(): Promise<IpcResult<AgentStatus>>
  /** 返回取消订阅函数 */
  onAgentEvent(listener: (event: AgentEvent) => void): () => void
  listRuns(): Promise<IpcResult<RunMeta[]>>
  readRun(name: string): Promise<IpcResult<RunLog>>
  /** 按运行读取原始标注截图（data URL），失败时界面退回缩略图 */
  readRunShot(runId: string, step: number): Promise<IpcResult<string | null>>
  openRunsDir(): Promise<IpcResult<null>>
}
