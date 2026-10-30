import {
  EMPTY_USAGE,
  type AgentEventPayload,
  type AgentRunReason,
  type PendingQuestion,
  type TokenUsage,
} from '../shared/agent'
import type { FrameSignature } from '../shared/types'
import type { SkillScript } from '../shared/script'
import type { ClickMark } from './annotate'
import { FailureGuard, type PauseGate } from './control'
import type { ShotRef } from './history'
import type { AgentMessage } from './llm'
import { buildSystemPrompt, type SkillPrompt } from './prompts/agent'
import { scriptTools } from './scripts'
import type { ToolDef } from './tools'

type Emit = (payload: AgentEventPayload) => void

export interface RunOptions {
  windowId: number
  task: string
  /** 用户勾选的技能正文，直接拼进系统提示 */
  skills: SkillPrompt[]
  /** 勾选技能里带的脚本，注册成 run_script_* 工具 */
  scripts: SkillScript[]
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
  /** 本次运行可用的脚本工具，与静态工具一起下发给模型 */
  scriptTools: ToolDef[]
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
  /** 上一步截图的原图签名，用来判断上一步动作有没有真的改变画面 */
  prevFrame: FrameSignature | null
  /** 上一步执行成功的输入类工具名，画面没变时据此告诉模型是哪个动作没生效 */
  lastAction: string | null
  /** 连续多少次输入动作没有引起画面变化，见 effect.ts */
  noEffect: number
  /** 最终核对连续未通过的次数，到上限就以 unverified 收尾 */
  verifyFailures: number
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
    scriptTools: scriptTools(options.scripts),
    busy: options.busy,
    ask: options.ask,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(options.skills, options.scripts),
      },
      { role: 'user', content: options.task },
    ],
    shots: [],
    usage: EMPTY_USAGE,
    steps: 0,
    lastText: null,
    mark: null,
    dirty: false,
    failed: false,
    prevFrame: null,
    lastAction: null,
    noEffect: 0,
    verifyFailures: 0,
  }
}
