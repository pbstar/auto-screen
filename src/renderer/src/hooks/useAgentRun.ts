import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EMPTY_USAGE,
  MAX_STEPS,
  type AgentEvent,
  type PauseReason,
  type PendingQuestion,
  type TokenUsage,
} from '@shared/agent'

const api = window.autoScreen
const MAX_ITEMS = 300

export interface TimelineItem {
  id: string
  kind: 'shot' | 'reply' | 'tool' | 'note'
  step: number
  name?: string
  detail?: string
  image?: string
  text?: string
  /** 长任务的实时进度，如「已等待 00:30 / 05:00」 */
  progress?: string
  status?: 'running' | 'ok' | 'error'
  durationMs?: number
  /** note 类条目的标题，如「已定流程」 */
  label?: string
  tone?: 'error'
}

/** 任务结束后沉淀技能的结果，非空时任务卡下方提示一行 */
export interface SkillOutcome {
  status: 'saved' | 'skipped' | 'failed'
  name?: string
  error?: string
}

export interface AgentRunState {
  status: 'idle' | 'running' | 'paused' | 'stopping'
  runId: string
  /** 由谁暂停：手动还是检测到人工操作 */
  pauseReason: PauseReason | null
  step: number
  maxSteps: number
  usage: TokenUsage
  items: TimelineItem[]
  error: string
  configReady: boolean
  /** 正在等待回答的问题，非空时界面显示提问卡片 */
  question: PendingQuestion | null
  skill: SkillOutcome | null
}

const INITIAL: AgentRunState = {
  status: 'idle',
  runId: '',
  pauseReason: null,
  step: 0,
  maxSteps: MAX_STEPS,
  usage: EMPTY_USAGE,
  items: [],
  error: '',
  configReady: true,
  question: null,
  skill: null,
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
        status: status.running ? (status.pauseReason ? 'paused' : 'running') : 'idle',
        pauseReason: status.pauseReason,
        step: status.step,
        maxSteps: status.maxSteps,
        usage: status.usage,
        configReady: status.configReady,
        question: status.question,
      }))
    })
    return unsubscribe
  }, [])

  const start = useCallback(
    async (windowId: number, task: string, skills: string[], autoSkill: boolean) => {
      const result = await api.startAgent({ windowId, task, skills, autoSkill })
      if (!result.ok) {
        setState((previous) => ({ ...previous, error: result.error }))
      }
    },
    [],
  )

  const stop = useCallback(async () => {
    const result = await api.stopAgent()
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  const pause = useCallback(async () => {
    const result = await api.pauseAgent()
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  const resume = useCallback(async () => {
    const result = await api.resumeAgent()
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  const answer = useCallback(async (callId: string, text: string | null) => {
    const result = await api.answerAgentQuestion({ callId, answer: text })
    if (!result.ok) {
      setState((previous) => ({ ...previous, error: result.error }))
    }
  }, [])

  return { state, start, stop, pause, resume, answer }
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
        question: null,
        skill: null,
      }
    case 'plan':
      return withNote(state, {
        id: `plan-${event.seq}`,
        kind: 'note',
        step: state.step,
        label: '已定流程',
        text: event.text,
      })
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
    case 'tool_progress':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === event.callId ? { ...item, progress: event.text } : item,
        ),
      }
    case 'usage':
      return { ...state, usage: event.usage }
    case 'question':
      return {
        ...state,
        question: {
          callId: event.callId,
          step: event.step,
          question: event.question,
          options: event.options,
          multiple: event.multiple,
        },
      }
    case 'answered':
      return { ...state, question: null }
    case 'verify': {
      const note: TimelineItem = {
        id: `verify-${event.seq}`,
        kind: 'note',
        step: event.step,
        label: event.ok ? '最终核对通过' : '最终核对未通过',
      }
      return withNote(state, event.ok ? note : { ...note, tone: 'error', text: event.problem })
    }
    case 'skill':
      return {
        ...state,
        skill: { status: event.status, name: event.name, error: event.error },
      }
    case 'paused':
      return { ...state, status: 'paused', pauseReason: event.reason }
    case 'resumed':
      return { ...state, status: 'running', pauseReason: null }
    case 'stopping':
      return { ...state, status: 'stopping' }
    case 'finished':
      return {
        ...state,
        status: 'idle',
        pauseReason: null,
        step: event.steps,
        usage: event.usage,
        error: event.error ?? reasonText(event.reason),
        question: null,
      }
  }
}

function append(state: AgentRunState, item: TimelineItem): AgentRunState {
  const items = state.items.length >= MAX_ITEMS
    ? [...state.items.slice(-(MAX_ITEMS - 1)), item]
    : [...state.items, item]
  return { ...state, step: item.step, items }
}

/** 提示类条目只追加，不推进步数 */
function withNote(state: AgentRunState, item: TimelineItem): AgentRunState {
  const items = state.items.length >= MAX_ITEMS
    ? [...state.items.slice(-(MAX_ITEMS - 1)), item]
    : [...state.items, item]
  return { ...state, items }
}

function summarize(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key}=${String(value).slice(0, 40)}`)
    .join(' ')
}

function reasonText(reason: string): string {
  if (reason === 'max_steps') return '已达到步数上限'
  if (reason === 'failed') return '任务失败'
  if (reason === 'unverified') return '结果未通过最终核对'
  return ''
}
