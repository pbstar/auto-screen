import type { AgentAnswer, AgentEventPayload, PendingQuestion } from '../shared/agent'

/** 提问需要的运行环境：事件广播、接管检测开关、前后台切换 */
interface QuestionHost {
  signal: AbortSignal
  /** 提问期间压住人工接管检测，否则用户点选项会被当成人工操作 */
  setBusy: (busy: boolean) => void
  emit: (payload: AgentEventPayload) => void
  /** 把本应用带到前台，用户才知道要回答 */
  showApp: () => void
  /** 回答后把目标窗口放回前台，下一步截图才截不到本应用 */
  activateTarget: () => Promise<void>
}

export interface QuestionDesk {
  /** 挂起等待用户回答，null 表示跳过；终止时以 AbortError 拒绝 */
  ask(request: PendingQuestion): Promise<string | null>
  /** 提交回答，没有对应的待回答问题时抛错 */
  answer(payload: AgentAnswer): Promise<void>
  /** 当前等待回答的问题，界面刷新后据此恢复 */
  readonly current: PendingQuestion | null
}

interface PendingAnswer {
  request: PendingQuestion
  settle: (answer: string | null) => void
}

/** 提问是唯一的「人机同步点」：一次只挂起一个问题，终止时把等待方就地取消 */
export function createQuestionDesk(host: QuestionHost): QuestionDesk {
  let pending: PendingAnswer | null = null

  const ask = (request: PendingQuestion): Promise<string | null> => {
    if (pending) return Promise.reject(new Error('已有等待回答的问题'))
    return new Promise<string | null>((resolve, reject) => {
      const onAbort = (): void => {
        pending = null
        host.setBusy(false)
        const error = new Error('任务已终止，提问没有回答')
        error.name = 'AbortError'
        reject(error)
      }
      host.signal.addEventListener('abort', onAbort, { once: true })
      pending = {
        request,
        settle: (answer) => {
          host.signal.removeEventListener('abort', onAbort)
          pending = null
          host.setBusy(false)
          resolve(answer)
        },
      }
      host.setBusy(true)
      host.emit({ type: 'question', ...request })
      host.showApp()
    })
  }

  const answer = async (payload: AgentAnswer): Promise<void> => {
    const current = pending
    if (!current || current.request.callId !== payload.callId) {
      throw new Error('没有等待回答的问题')
    }
    // 先占住位置，重复提交直接拒绝；窗口切回去之前循环不会继续
    pending = null
    const text = payload.answer === null ? null : payload.answer.slice(0, 2000)
    await host.activateTarget()
    current.settle(text)
    host.emit({ type: 'answered', callId: payload.callId, answer: text })
  }

  return {
    ask,
    answer,
    get current() {
      return pending?.request ?? null
    },
  }
}
