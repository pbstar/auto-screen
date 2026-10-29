import type { BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  EMPTY_USAGE,
  MAX_STEPS,
  type AgentAnswer,
  type AgentEvent,
  type AgentEventPayload,
  type AgentStartRequest,
  type AgentStatus,
  type TokenUsage,
} from '../shared/agent'
import { IPC } from '../shared/ipc'
import type { SkillScript } from '../shared/script'
import { singleLine } from '../shared/text'
import { activateWindow } from '../core/safety'
import { createPointerWatcher, type PointerWatcher } from '../core/pointer'
import { configReady, readModelConfig } from '../main/config'
import { appendLog, createRun, finishRun, saveShot } from './run-store'
import { logEvent } from './event-log'
import { readRulePrompts } from './rules'
import { readSkillPrompts } from './skills'
import { PauseGate } from './control'
import { describeError } from './llm'
import { HEAVY_EFFORT, ROUTINE_EFFORT, runAgent } from './loop'
import type { RunOutcome } from './run-context'
import { distillSkill } from './distill'
import { createQuestionDesk, type QuestionDesk } from './questions'

type WindowGetter = () => BrowserWindow | null

interface ActiveRun {
  runId: string
  windowId: number
  controller: AbortController
  gate: PauseGate
  watcher: PointerWatcher
  /** 提问挂起与回答，见 questions.ts */
  questions: QuestionDesk
  /** 任务自然完成后是否沉淀技能 */
  autoSkill: boolean
  /** 每步一行的动作轨迹，沉淀技能时作为材料 */
  trace: string[]
  /** 正在执行的那次工具调用，等 tool_finished 回来合成一行轨迹 */
  pending: { step: number; name: string; input: Record<string, unknown> } | null
  /** 任务已经收尾、只剩技能沉淀在跑；这期间暂停与终止都不能再改界面状态 */
  finished: boolean
}

let active: ActiveRun | null = null
let seq = 0
let lastStep = 0
let lastUsage: TokenUsage = EMPTY_USAGE

export async function startAgent(
  getWindow: WindowGetter,
  request: AgentStartRequest,
): Promise<void> {
  if (active) throw new Error('已有任务在运行，请先停止')
  const task = request.task.trim()
  if (!task) throw new Error('任务不能为空')
  const config = readModelConfig()
  const rules = readRulePrompts()
  const skills = readSkillPrompts(request.skills)
  // 脚本随技能一起加载：勾了技能，它 scripts/ 下的脚本才逐个注册成工具
  const scripts: SkillScript[] = skills.flatMap((skill) =>
    skill.scripts.map((item) => ({
      skillId: skill.id,
      skillName: skill.name,
      scriptId: item.id,
      script: item.script,
    })),
  )
  // 目标不在最前，鼠标就会点在自己身上；激活失败就不要开跑
  await activateWindow(request.windowId)

  const runId = randomUUID()
  const controller = new AbortController()
  const startedAt = Date.now()
  // 先建运行目录：写盘失败就直接报错，不要留下一个「运行中」的空壳
  createRun(runId, task, request.windowId)
  appendLog(
    runId,
    `模型：${config.model} · 思考强度 首步/失败恢复 ${HEAVY_EFFORT} · 常规 ${ROUTINE_EFFORT}`,
  )
  const customRules = rules.filter((rule) => !rule.builtin).map((rule) => rule.name)
  appendLog(
    runId,
    `规则：内置 ${rules.length - customRules.length} 条 · ` +
      `自定义 ${customRules.length > 0 ? customRules.join('、') : '无'}`,
  )
  appendLog(
    runId,
    `技能：${skills.length > 0 ? skills.map((skill) => skill.name).join('、') : '未勾选'}`,
  )
  if (scripts.length > 0) {
    const summary = scripts.map((item) => `${item.script.name}（${item.script.steps.length} 步）`)
    appendLog(runId, `脚本：${summary.join('、')}`)
  }
  if (request.autoSkill) appendLog(runId, '完成后自动沉淀技能：开启')

  const gate = new PauseGate()
  const watcher = createPointerWatcher(() => {
    if (!gate.pause('human')) return
    broadcast(getWindow(), runId, { type: 'paused', reason: 'human' })
  })
  const questions = createQuestionDesk({
    signal: controller.signal,
    setBusy: (on) => watcher.markBusy(on),
    emit: (payload) => broadcast(getWindow(), runId, payload),
    showApp: () => focusWindow(getWindow()),
    activateTarget: () => activateWindow(request.windowId).catch(() => {}),
  })
  const run: ActiveRun = {
    runId,
    windowId: request.windowId,
    controller,
    gate,
    watcher,
    questions,
    autoSkill: request.autoSkill,
    trace: [],
    pending: null,
    finished: false,
  }
  active = run
  seq = 0
  lastStep = 0
  lastUsage = EMPTY_USAGE

  void runAgent({
    windowId: request.windowId,
    task,
    rules,
    skills,
    scripts,
    signal: controller.signal,
    emit: (payload) => broadcast(getWindow(), runId, payload),
    saveShot: (step, dataUrl) => saveShot(runId, step, dataUrl),
    gate,
    busy: (on) => watcher.markBusy(on),
    ask: (request) => questions.ask(request),
  })
    .then(async (outcome) => {
      broadcast(getWindow(), runId, {
        type: 'finished',
        reason: outcome.reason,
        text: outcome.text,
        error: outcome.error,
        steps: outcome.steps,
        usage: outcome.usage,
        durationMs: outcome.durationMs,
      })
      if (outcome.error) appendLog(runId, `错误：${outcome.error}`)
      run.finished = true
      // 任务已结束：立刻停掉接管采样和暂停闸门。否则收尾沉淀的几秒里动一下鼠标
      // 会再发一条暂停事件，界面卡在「暂停」而继续/终止都已经无效
      watcher.stop()
      gate.resume()
      await maybeDistill(getWindow, run, task, outcome)
      finishRun(runId, outcome.reason)
    })
    .catch((error: unknown) => {
      const message = describeError(error)
      broadcast(getWindow(), runId, {
        type: 'finished',
        reason: 'failed',
        error: message,
        steps: lastStep,
        usage: lastUsage,
        durationMs: Date.now() - startedAt,
      })
      appendLog(runId, `错误：${message}`)
      finishRun(runId, 'failed')
    })
    .finally(() => {
      watcher.stop()
      gate.resume()
      active = null
      // 运行期间目标窗口在最前，结束时把本窗口带回前台，用户能立刻看到结果
      focusWindow(getWindow())
    })
}

export function stopAgent(getWindow: WindowGetter): void {
  const run = active
  if (!run) return
  // 任务已经结束、只剩技能沉淀在跑：只取消沉淀，不再发事件，免得界面卡在「终止中」
  if (run.finished) {
    run.controller.abort()
    return
  }
  broadcast(getWindow(), run.runId, { type: 'stopping' })
  // 已经要停了，没必要再检测人手接管
  run.watcher.stop()
  run.gate.resume()
  run.controller.abort()
}

export function pauseAgent(getWindow: WindowGetter): void {
  const run = active
  if (!run || run.finished) return
  if (!run.gate.pause('user')) return
  broadcast(getWindow(), run.runId, { type: 'paused', reason: 'user' })
}

export async function resumeAgent(getWindow: WindowGetter): Promise<void> {
  const run = active
  if (!run || run.finished) return
  // 先确保目标回到最前，失败就不恢复，免得动作落空
  await activateWindow(run.windowId)
  if (active !== run || !run.gate.resume()) return
  void run.watcher.resync()
  broadcast(getWindow(), run.runId, { type: 'resumed' })
}

export async function answerAgent(payload: AgentAnswer): Promise<void> {
  const run = active
  if (!run || run.finished) throw new Error('没有等待回答的问题')
  await run.questions.answer(payload)
}

export function agentStatus(): AgentStatus {
  // 收尾后只剩沉淀在跑，对界面来说任务已经结束
  const run = active?.finished ? null : active
  return {
    running: run !== null,
    pauseReason: run?.gate.paused ?? null,
    step: run ? lastStep : 0,
    maxSteps: MAX_STEPS,
    usage: run ? lastUsage : EMPTY_USAGE,
    configReady: configReady(),
    question: run?.questions.current ?? null,
  }
}

/** 主窗口可能已关闭，统一在入口挡住 */
function focusWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return
  win.show()
  win.focus()
}

function broadcast(win: BrowserWindow | null, runId: string, payload: AgentEventPayload): void {
  seq += 1
  track(payload)
  logEvent(runId, payload)
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
  const event = { ...payload, runId, seq } as AgentEvent
  win.webContents.send(IPC.agentEvent, event)
}

function track(payload: AgentEventPayload): void {
  if ('step' in payload) lastStep = payload.step
  if (payload.type === 'usage') lastUsage = payload.usage
  if (!active) return
  // 工具的开始与结束配成一行轨迹，模型每步的判断也记一行：
  // 只有坐标的话，沉淀技能时写不出「点的是哪个元素」
  if (payload.type === 'tool_started') {
    active.pending = { step: payload.step, name: payload.name, input: payload.input }
  } else if (payload.type === 'tool_finished' && active.pending) {
    active.trace.push(traceLine(active.pending, payload))
    active.pending = null
  } else if (payload.type === 'reply' && payload.text) {
    active.trace.push(`第 ${payload.step} 步 判断：${singleLine(payload.text, 120)}`)
  }
}


function traceLine(
  start: NonNullable<ActiveRun['pending']>,
  end: Extract<AgentEventPayload, { type: 'tool_finished' }>,
): string {
  const args = Object.entries(start.input)
    .map(([key, value]) => `${key}=${String(value).slice(0, 40)}`)
    .join(' ')
  const text = singleLine(end.text, 120)
  return `第 ${start.step} 步 ${start.name}(${args}) → ${end.isError ? '失败' : '成功'}：${text}`
}

/** 任务自然完成后沉淀技能；失败或跳过都只多一条提示，不改变任务结果 */
async function maybeDistill(
  getWindow: WindowGetter,
  run: ActiveRun,
  task: string,
  outcome: RunOutcome,
): Promise<void> {
  if (!run.autoSkill || outcome.reason !== 'completed' || outcome.steps < 3) return
  const result = await distillSkill({
    task,
    windowId: run.windowId,
    trace: run.trace,
    signal: run.controller.signal,
  })
  // 蒸馏期间被终止：静默跳过，不发事件（文件只在拿到回复后才写）
  if (run.controller.signal.aborted) return
  if (result.status !== 'failed') {
    appendLog(
      run.runId,
      `沉淀用量 prompt=${result.usage.prompt}（命中缓存 ${result.usage.cached}）` +
        ` completion=${result.usage.completion}`,
    )
  }
  broadcast(getWindow(), run.runId, {
    type: 'skill',
    status: result.status,
    ...(result.status === 'saved' ? { name: result.skill.name, id: result.skill.id } : {}),
    ...(result.status === 'failed' ? { error: result.error } : {}),
  })
}

