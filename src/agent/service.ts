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
    signal: controller.signal,
    emit: (payload) => broadcast(getWindow(), runId, payload),
    saveShot: (step, dataUrl) => saveShot(runId, step, dataUrl),
    gate,
    busy: (on) => watcher.markBusy(on),
    ask: (request) => questions.ask(request),
  })
    .then((outcome) => {
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
  if (!active) return
  broadcast(getWindow(), active.runId, { type: 'stopping' })
  active.gate.resume()
  active.controller.abort()
}

export function pauseAgent(getWindow: WindowGetter): void {
  if (!active) return
  if (!active.gate.pause('user')) return
  broadcast(getWindow(), active.runId, { type: 'paused', reason: 'user' })
}

export async function resumeAgent(getWindow: WindowGetter): Promise<void> {
  const run = active
  if (!run) return
  // 先确保目标回到最前，失败就不恢复，免得动作落空
  await activateWindow(run.windowId)
  if (active !== run || !run.gate.resume()) return
  void run.watcher.resync()
  broadcast(getWindow(), run.runId, { type: 'resumed' })
}

export async function answerAgent(payload: AgentAnswer): Promise<void> {
  const run = active
  if (!run) throw new Error('没有等待回答的问题')
  await run.questions.answer(payload)
}

export function agentStatus(): AgentStatus {
  // 空闲时上一轮的步数/tokens 已经没有对应的截图进度，清零，免得新会话里只剩读数
  const running = active !== null
  return {
    running,
    pauseReason: active?.gate.paused ?? null,
    step: running ? lastStep : 0,
    maxSteps: MAX_STEPS,
    usage: running ? lastUsage : EMPTY_USAGE,
    configReady: configReady(),
    question: active?.questions.current ?? null,
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
}

