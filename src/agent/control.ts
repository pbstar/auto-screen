import type { PauseReason } from '../shared/agent'

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

/** 环境性故障再试也没用，第一次就要报给人类 */
const FATAL_PATTERNS = [/目标窗口不存在/, /辅助功能/, /权限/]
/** 只对指针动作做原地重复检测：滚动、输入、等待重复是合理的 */
const REPEAT_CHECKED = new Set(['click', 'move', 'drag'])
const MAX_FAILURES = 2
const MAX_REPEATS = 3

/**
 * 失败收敛：工具报错原本交给模型自己换策略，但模型常常原地重试，
 * 十几步下来既没进展又烧 token。这里把「绝无可能成功」和「明显卡死」提前掐掉。
 */
export class FailureGuard {
  private failures = 0
  private lastSignature = ''
  private repeats = 0

  /** 返回终止原因；null 表示可以继续 */
  observe(
    name: string,
    input: Record<string, unknown>,
    text: string,
    isError: boolean,
  ): string | null {
    this.trackRepeat(name, input)

    if (isError) {
      if (FATAL_PATTERNS.some((pattern) => pattern.test(text))) {
        return `工具 ${name} 无法执行：${text}`
      }
      this.failures += 1
      if (this.failures >= MAX_FAILURES) {
        return `工具 ${name} 连续失败 ${this.failures} 次：${text}`
      }
    } else {
      this.failures = 0
    }

    if (this.repeats >= MAX_REPEATS) {
      return `模型连续 ${this.repeats} 次执行同一个 ${name}，没有进展，已终止`
    }
    return null
  }

  private trackRepeat(name: string, input: Record<string, unknown>): void {
    const signature = `${name}:${JSON.stringify(input)}`
    const same = signature === this.lastSignature
    this.lastSignature = signature
    if (!REPEAT_CHECKED.has(name)) {
      this.repeats = 0
      return
    }
    this.repeats = same ? this.repeats + 1 : 1
  }
}
