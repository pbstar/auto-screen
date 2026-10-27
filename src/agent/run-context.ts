import {
  EMPTY_USAGE,
  type AgentEventPayload,
  type AgentRunReason,
  type PendingQuestion,
  type TokenUsage,
} from '../shared/agent'
import type { ClickMark } from './annotate'
import { FailureGuard, type PauseGate } from './control'
import type { ShotRef } from './history'
import type { AgentMessage } from './llm'
import { buildSystemPrompt, type RulePrompt, type SkillPrompt } from './prompts/agent'

export type Emit = (payload: AgentEventPayload) => void

export interface RunOptions {
  windowId: number
  task: string
  /** 始终生效的规则，内置与自定义都在里面 */
  rules: RulePrompt[]
  /** 用户勾选的技能正文，直接拼进系统提示 */
  skills: SkillPrompt[]
  signal: AbortSignal
  emit: Emit
  /** 把标注后的完整截图落到运行记录里，供大图查看 */
  saveShot: (step: number, dataUrl: string) => void
  gate: PauseGate
  /** 标记鼠标键盘正在被 Agent 使用 */
  busy: (on: boolean) => void
  /** 向用户提问并等待回答，null 表示跳过 */
  ask: (request: PendingQuestion) => Promise<string | null>
}

export interface RunOutcome {
  reason: AgentRunReason
  text?: string
  error?: string
  steps: number
  usage: TokenUsage
  durationMs: number
}

/** 一次运行的内存状态：循环、工具执行与收尾都只看这一个对象 */
export interface RunContext {
  windowId: number
  task: string
  /** 规划阶段给出的流程，后续步骤带着它执行，最终核对也用它 */
  plan: string | null
  signal: AbortSignal
  emit: Emit
  saveShot: (step: number, dataUrl: string) => void
  gate: PauseGate
  guard: FailureGuard
  busy: (on: boolean) => void
  /** 向用户提问并等待回答 */
  ask: (request: PendingQuestion) => Promise<string | null>
  messages: AgentMessage[]
  shots: ShotRef[]
  usage: TokenUsage
  steps: number
  error?: string
  lastText: string | null
  mark: ClickMark | null
  /** 上一步是否动过鼠标键盘，没动过就不用等重绘 */
  dirty: boolean
  /** 上一步是否有工具失败，失败后的下一步需要重新想 */
  failed: boolean
}

export function createContext(options: RunOptions): RunContext {
  return {
    windowId: options.windowId,
    task: options.task,
    plan: null,
    signal: options.signal,
    emit: options.emit,
    saveShot: options.saveShot,
    gate: options.gate,
    guard: new FailureGuard(),
    busy: options.busy,
    ask: options.ask,
    messages: [
      { role: 'system', content: buildSystemPrompt(options.rules, options.skills) },
      { role: 'user', content: options.task },
    ],
    shots: [],
    usage: EMPTY_USAGE,
    steps: 0,
    lastText: null,
    mark: null,
    dirty: false,
    failed: false,
  }
}
