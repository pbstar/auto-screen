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
import { withWindowHidden } from '../../src/core/safety'
import { createPointerWatcher, type PointerWatcher } from '../../src/core/pointer'
import { configReady, readModelConfig } from '../config'
import { appendLog, createRun, finishRun, saveShot } from '../run-store'
import { PauseGate } from './control'
import { describeError } from './llm'
import { MAX_STEPS, runAgent } from './loop'

type WindowGetter = () => BrowserWindow | null

interface ActiveRun {
  runId: string
  controller: AbortController
  gate: PauseGate
  watcher: PointerWatcher
}

let active: ActiveRun | null = null
let seq = 0
let lastStep = 0
let lastUsage: TokenUsage = { prompt: 0, completion: 0 }

export function startAgent(getWindow: WindowGetter, request: AgentStartRequest): void {
  if (active) throw new Error('已有任务在运行，请先停止')
  const task = request.task.trim()
  if (!task) throw new Error('任务不能为空')
  const config = readModelConfig()

  const runId = randomUUID()
  const controller = new AbortController()
  const startedAt = Date.now()
  // 先建运行目录：写盘失败就直接报错，不要留下一个「运行中」的空壳
  createRun(runId, task, request.windowId)
  appendLog(runId, `模型：${config.model} · 思考强度 ${config.reasoningEffort}`)

  const gate = new PauseGate()
  const watcher = createPointerWatcher(() => {
    if (!gate.pause('human')) return
    broadcast(getWindow(), runId, { type: 'paused', reason: 'human' })
  })
  active = { runId, controller, gate, watcher }
  seq = 0
  lastStep = 0
  lastUsage = { prompt: 0, completion: 0 }

  void runAgent({
    windowId: request.windowId,
    task,
    signal: controller.signal,
    emit: (payload) => broadcast(getWindow(), runId, payload),
    hide: (hide, action) => withWindowHidden(getWindow(), hide, action),
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

export function resumeAgent(getWindow: WindowGetter): void {
  if (!active) return
  if (!active.gate.resume()) return
  void active.watcher.resync()
  broadcast(getWindow(), active.runId, { type: 'resumed' })
}

export function agentStatus(): AgentStatus {
  return {
    running: active !== null,
    pauseReason: active?.gate.paused ?? null,
    step: lastStep,
    maxSteps: MAX_STEPS,
    usage: lastUsage,
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
      appendLog(runId, `用量 prompt=${payload.usage.prompt} completion=${payload.usage.completion}`)
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
