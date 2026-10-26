export interface TokenUsage {
  prompt: number
  completion: number
  /** 其中命中前缀缓存的部分，DeepSeek 按更低价格计费 */
  cached: number
}

export const EMPTY_USAGE: TokenUsage = { prompt: 0, completion: 0, cached: 0 }

/**
 * 操作手册类任务动辄上百步，30 步会在中途被掐断；
 * 上限只用来兜住死循环，正常任务不该碰到。
 */
export const MAX_STEPS = 300

/** 思考强度：第 1 步与失败恢复步用 high，其余步骤 low，策略固定在循环里，不做配置化 */
export type ReasoningEffort = 'low' | 'high'

export type AgentRunReason = 'completed' | 'stopped' | 'max_steps' | 'failed'

/** user = 手动暂停，human = 检测到人工操作鼠标 */
export type PauseReason = 'user' | 'human'

export interface AgentStartRequest {
  windowId: number
  task: string
  /** 勾选的技能 id，对应 skills/<id>/SKILL.md */
  skills: string[]
}

export interface AgentStatus {
  running: boolean
  /** 非空表示当前处于暂停，并说明是谁暂停的 */
  pauseReason: PauseReason | null
  step: number
  maxSteps: number
  usage: TokenUsage
  configReady: boolean
}

export interface AgentEventBase {
  runId: string
  seq: number
}

/**
 * 一次运行的事件流。runId + seq 用于渲染进程去重，
 * 页面刷新后旧事件不会和新一次运行混在一起。
 */
export type AgentEvent =
  | (AgentEventBase & { type: 'started'; task: string; maxSteps: number })
  | (AgentEventBase & {
      type: 'shot'
      step: number
      /** 缩略图 data URL，避免把原图塞进事件通道 */
      image: string
      width: number
      height: number
    })
  | (AgentEventBase & { type: 'reply'; step: number; text: string | null })
  | (AgentEventBase & {
      type: 'tool_started'
      step: number
      callId: string
      name: string
      input: Record<string, unknown>
    })
  | (AgentEventBase & {
      type: 'tool_finished'
      step: number
      callId: string
      name: string
      text: string
      isError: boolean
      durationMs: number
    })
  | (AgentEventBase & { type: 'usage'; usage: TokenUsage; effort: ReasoningEffort })
  | (AgentEventBase & { type: 'paused'; reason: PauseReason })
  | (AgentEventBase & { type: 'resumed' })
  | (AgentEventBase & { type: 'stopping' })
  | (AgentEventBase & {
      type: 'finished'
      reason: AgentRunReason
      text?: string
      error?: string
      steps: number
      usage: TokenUsage
      durationMs: number
    })

/** 生产端只构造事件内容，runId 与 seq 由服务层补齐 */
export type AgentEventPayload = AgentEvent extends infer T
  ? T extends AgentEventBase
    ? Omit<T, keyof AgentEventBase>
    : never
  : never
