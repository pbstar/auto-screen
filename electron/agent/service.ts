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
import { configReady, readModelConfig } from '../config'
import { describeError } from './llm'
import { MAX_STEPS, runAgent } from './loop'

type WindowGetter = () => BrowserWindow | null

interface ActiveRun {
  runId: string
  controller: AbortController
}

let active: ActiveRun | null = null
let seq = 0
let lastStep = 0
let lastUsage: TokenUsage = { prompt: 0, completion: 0 }

export function startAgent(getWindow: WindowGetter, request: AgentStartRequest): void {
  if (active) throw new Error('已有任务在运行，请先停止')
  const task = request.task.trim()
  if (!task) throw new Error('任务不能为空')
  readModelConfig()

  const runId = randomUUID()
  const controller = new AbortController()
  const startedAt = Date.now()
  active = { runId, controller }
  seq = 0
  lastStep = 0
  lastUsage = { prompt: 0, completion: 0 }

  void runAgent({
    windowId: request.windowId,
    task,
    signal: controller.signal,
    emit: (payload) => broadcast(getWindow(), runId, payload),
    hide: (hide, action) => withWindowHidden(getWindow(), hide, action),
  })
    .then((outcome) =>
      broadcast(getWindow(), runId, {
        type: 'finished',
        reason: outcome.reason,
        text: outcome.text,
        error: outcome.error,
        steps: outcome.steps,
        usage: outcome.usage,
        durationMs: outcome.durationMs,
      }),
    )
    .catch((error: unknown) =>
      broadcast(getWindow(), runId, {
        type: 'finished',
        reason: 'failed',
        error: describeError(error),
        steps: lastStep,
        usage: lastUsage,
        durationMs: Date.now() - startedAt,
      }),
    )
    .finally(() => {
      active = null
    })
}

export function stopAgent(getWindow: WindowGetter): void {
  if (!active) return
  broadcast(getWindow(), active.runId, { type: 'stopping' })
  active.controller.abort()
}

export function agentStatus(): AgentStatus {
  return {
    running: active !== null,
    step: lastStep,
    maxSteps: MAX_STEPS,
    usage: lastUsage,
    configReady: configReady(),
  }
}

function broadcast(win: BrowserWindow | null, runId: string, payload: AgentEventPayload): void {
  seq += 1
  track(payload)
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return
  const event = { ...payload, runId, seq } as AgentEvent
  win.webContents.send(IPC.agentEvent, event)
}

function track(payload: AgentEventPayload): void {
  if ('step' in payload) lastStep = payload.step
  if (payload.type === 'usage') lastUsage = payload.usage
}
