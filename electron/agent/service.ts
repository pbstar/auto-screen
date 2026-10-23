import type { BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import type {
  AgentEvent,
  AgentEventPayload,
  AgentStartRequest,
  AgentStatus,
  TokenUsage,
} from '../../src/shared/agent'
import { IPC } from '../../src/shared/ipc'
import { activateWindow } from '../../src/core/safety'
import { createPointerWatcher, type PointerWatcher } from '../../src/core/pointer'
import { configReady, readModelConfig } from '../config'
import { appendLog, createRun, finishRun, saveShot } from '../run-store'
import { PauseGate } from './control'
import { describeError } from './llm'
import { HEAVY_EFFORT, MAX_STEPS, ROUTINE_EFFORT, runAgent } from './loop'

type WindowGetter = () => BrowserWindow | null

interface ActiveRun {
  runId: string
  windowId: number
  controller: AbortController
  gate: PauseGate
  watcher: PointerWatcher
}

let active: ActiveRun | null = null
let seq = 0
let lastStep = 0
let lastUsage: TokenUsage = { prompt: 0, completion: 0 }

export async function startAgent(
  getWindow: WindowGetter,
  request: AgentStartRequest,
): Promise<void> {
  if (active) throw new Error('已有任务在运行，请先停止')
  const task = request.task.trim()
  if (!task) throw new Error('任务不能为空')
  const config = readModelConfig()
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

  const gate = new PauseGate()
  const watcher = createPointerWatcher(() => {
    if (!gate.pause('human')) return
    broadcast(getWindow(), runId, { type: 'paused', reason: 'human' })
  })
  active = { runId, windowId: request.windowId, controller, gate, watcher }
  seq = 0
  lastStep = 0
  lastUsage = { prompt: 0, completion: 0 }

  void runAgent({
    windowId: request.windowId,
    task,
    signal: controller.signal,
    emit: (payload) => broadcast(getWindow(), runId, payload),
    saveShot: (step, dataUrl) => saveShot(runId, step, dataUrl),
    gate,
    busy: (on) => watcher.markBusy(on),
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
      const win = getWindow()
      if (win && !win.isDestroyed()) {
        win.show()
        win.focus()
      }
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

export function agentStatus(): AgentStatus {
  // 空闲时上一轮的步数/tokens 已经没有对应的截图进度，清零，免得新会话里只剩读数
  const running = active !== null
  return {
    running,
    pauseReason: active?.gate.paused ?? null,
    step: running ? lastStep : 0,
    maxSteps: MAX_STEPS,
    usage: running ? lastUsage : { prompt: 0, completion: 0 },
    configReady: configReady(),
  }
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

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim().slice(0, 500)
}

/** 事件即运行日志：每个事件都落一行，事后可以完整复盘 */
function logEvent(runId: string, payload: AgentEventPayload): void {
  switch (payload.type) {
    case 'started':
      appendLog(runId, `开始，最多 ${payload.maxSteps} 步`)
      break
    case 'shot':
      appendLog(runId, `第 ${payload.step} 步截图 ${payload.width}×${payload.height}`)
      break
    case 'reply':
      if (payload.text) appendLog(runId, `第 ${payload.step} 步模型：${oneLine(payload.text)}`)
      break
    case 'tool_started':
      appendLog(
        runId,
        `第 ${payload.step} 步 → ${payload.name} ${JSON.stringify(payload.input)}`,
      )
      break
    case 'tool_finished':
      appendLog(
        runId,
        `第 ${payload.step} 步 ← ${payload.name} ${payload.isError ? '失败' : '成功'} ` +
          `${payload.durationMs}ms ${oneLine(payload.text)}`,
      )
      break
    case 'usage':
      appendLog(
        runId,
        `用量 prompt=${payload.usage.prompt} completion=${payload.usage.completion}` +
          ` · effort=${payload.effort}`,
      )
      break
    case 'stopping':
      appendLog(runId, '收到停止指令')
      break
    case 'paused':
      appendLog(runId, payload.reason === 'human' ? '检测到人工操作，已暂停' : '手动暂停')
      break
    case 'resumed':
      appendLog(runId, '继续执行')
      break
  }
}
