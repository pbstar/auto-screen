import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentEvent, TokenUsage } from '@shared/agent'

const api = window.autoScreen
const MAX_ITEMS = 300
const EMPTY_USAGE: TokenUsage = { prompt: 0, completion: 0 }

export interface TimelineItem {
  id: string
  kind: 'shot' | 'reply' | 'tool'
  step: number
  name?: string
  detail?: string
  image?: string
  text?: string
  status?: 'running' | 'ok' | 'error'
  durationMs?: number
}

export interface AgentRunState {
  status: 'idle' | 'running' | 'stopping'
  runId: string
  step: number
  maxSteps: number
  usage: TokenUsage
  items: TimelineItem[]
  error: string
  configReady: boolean
}

const INITIAL: AgentRunState = {
  status: 'idle',
  runId: '',
  step: 0,
  maxSteps: 30,
  usage: EMPTY_USAGE,
  items: [],
  error: '',
  configReady: true,
}

export function useAgentRun() {
  const [state, setState] = useState<AgentRunState>(INITIAL)
  const runIdRef = useRef<string | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const handle = (event: AgentEvent) => {
      if (event.type === 'started') {
        runIdRef.current = event.runId
        seqRef.current = 0
      } else if (runIdRef.current && runIdRef.current !== event.runId) {
        return
      } else if (!runIdRef.current) {
        runIdRef.current = event.runId
      }
      if (event.seq <= seqRef.current) return
      seqRef.current = event.seq
      setState((previous) => applyEvent(previous, event))
    }

    const unsubscribe = api.onAgentEvent(handle)
    void api.agentStatus().then((result) => {
      if (!result.ok) return
      const status = result.data
      setState((previous) => ({
        ...previous,
        status: status.running ? 'running' : 'idle',
        step: status.step,
        maxSteps: status.maxSteps,
        usage: status.usage,
        configReady: status.configReady,
      }))
    })
    return unsubscribe
  }, [])

  const start = useCallback(async (windowId: number, task: string) => {
    const result = await api.startAgent({ windowId, task })
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  const stop = useCallback(async () => {
    const result = await api.stopAgent()
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  return { state, start, stop }
}

function applyEvent(state: AgentRunState, event: AgentEvent): AgentRunState {
  switch (event.type) {
    case 'started':
      return {
        ...state,
        status: 'running',
        runId: event.runId,
        step: 0,
        usage: EMPTY_USAGE,
        items: [],
        error: '',
      }
    case 'shot':
      return append(state, {
        id: `shot-${event.seq}`,
        kind: 'shot',
        step: event.step,
        image: event.image,
        detail: `${event.width}×${event.height}`,
      })
    case 'reply':
      return append(state, {
        id: `reply-${event.seq}`,
        kind: 'reply',
        step: event.step,
        text: event.text ?? '',
      })
    case 'tool_started':
      return {
        ...append(state, {
          id: event.callId,
          kind: 'tool',
          step: event.step,
          name: event.name,
          detail: summarize(event.input),
          status: 'running',
        }),
        step: event.step,
      }
    case 'tool_finished':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === event.callId
            ? { ...item, status: event.isError ? 'error' : 'ok', text: event.text, durationMs: event.durationMs }
            : item,
        ),
      }
    case 'usage':
      return { ...state, usage: event.usage }
    case 'stopping':
      return { ...state, status: 'stopping' }
    case 'finished':
      return {
        ...state,
        status: 'idle',
        step: event.steps,
        usage: event.usage,
        error: event.error ?? reasonText(event.reason),
      }
  }
}

function append(state: AgentRunState, item: TimelineItem): AgentRunState {
  const items = state.items.length >= MAX_ITEMS
    ? [...state.items.slice(-(MAX_ITEMS - 1)), item]
    : [...state.items, item]
  return { ...state, step: item.step, items }
}

function summarize(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${String(value).slice(0, 40)}`)
    .join(' ')
}

function reasonText(reason: string): string {
  if (reason === 'max_steps') return '已达到步数上限'
  if (reason === 'failed') return '任务失败'
  return ''
}
