import type { PauseReason } from '../../src/shared/agent'

/** 暂停闸门：循环在步骤边界挂起，直到继续或被中止 */
export class PauseGate {
  private reason: PauseReason | null = null
  private waiters: Array<() => void> = []

  get paused(): PauseReason | null {
    return this.reason
  }

  /** 返回 false 表示已经处于暂停，调用方不必重复广播 */
  pause(reason: PauseReason): boolean {
    if (this.reason) return false
    this.reason = reason
    return true
  }

  resume(): boolean {
    if (!this.reason) return false
    this.reason = null
    this.waiters.splice(0).forEach((wake) => wake())
    return true
  }

  async wait(signal: AbortSignal): Promise<void> {
    while (this.reason && !signal.aborted) {
      await new Promise<void>((resolve) => {
        const wake = (): void => {
          signal.removeEventListener('abort', wake)
          resolve()
        }
        this.waiters.push(wake)
        signal.addEventListener('abort', wake, { once: true })
      })
    }
  }
}
