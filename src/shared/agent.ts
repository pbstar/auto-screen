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

/** unverified = 模型宣布完成，但最终核对连续未通过 */
export type AgentRunReason = 'completed' | 'stopped' | 'max_steps' | 'failed' | 'unverified'

/** user = 手动暂停，human = 检测到人工操作鼠标 */
export type PauseReason = 'user' | 'human'

/** 提问的选项，description 是可选的补充说明 */
export interface AskOption {
  label: string
  description?: string
}

/** 等待用户回答的问题；callId 把回答对回这次工具调用 */
export interface PendingQuestion {
  callId: string
  step: number
  question: string
  options: AskOption[]
  multiple: boolean
}

/** 用户对提问的回答，answer 为 null 表示跳过 */
export interface AgentAnswer {
  callId: string
  answer: string | null
}

export interface AgentStartRequest {
  windowId: number
  task: string
  /** 勾选的技能 id，对应 skills/<id>/SKILL.md */
  skills: string[]
  /** 任务自然完成后，把这次的操作流程沉淀成技能手册 */
  autoSkill: boolean
}

export interface AgentStatus {
  running: boolean
  /** 非空表示当前处于暂停，并说明是谁暂停的 */
  pauseReason: PauseReason | null
  step: number
  maxSteps: number
  usage: TokenUsage
  configReady: boolean
  /** 正在等待用户回答的问题，界面刷新后据此恢复 */
  question: PendingQuestion | null
}

interface AgentEventBase {
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
      type: 'plan'
      /** 规划阶段给出的流程与完成标准，原样展示 */
      text: string
    })
  | (AgentEventBase & {
      type: 'shot'
      step: number
      /** 缩略图 data URL，避免把原图塞进事件通道 */
      image: string
      width: number
      height: number
      /** 上一步动作没有改变画面时的观察，随这张截图一起给模型 */
      note?: string
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
  | (AgentEventBase & {
      type: 'tool_progress'
      step: number
      callId: string
      /** 长任务的进度文案，如「已等待 00:30 / 05:00」 */
      text: string
    })
  | (AgentEventBase & {
      type: 'question'
      step: number
      callId: string
      question: string
      options: AskOption[]
      multiple: boolean
    })
  | (AgentEventBase & { type: 'answered'; callId: string; answer: string | null })
  | (AgentEventBase & {
      type: 'verify'
      step: number
      ok: boolean
      /** 不通过时的差距说明 */
      problem: string
    })
  | (AgentEventBase & {
      type: 'skill'
      /** saved = 已写盘，skipped = 没有可复用流程，failed = 生成或写盘出错 */
      status: 'saved' | 'skipped' | 'failed'
      /** 生成的技能名与目录，失败或跳过时为空 */
      name?: string
      id?: string
      error?: string
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
