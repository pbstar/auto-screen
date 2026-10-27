import type { PauseControl } from '../../shared/types'
import { durationText } from '../../shared/time'

const TICK_MS = 500
/** 进度每十秒报一次：够界面看出在推进，又不至于刷屏 */
export const PROGRESS_MS = 10_000

export interface WaitRun {
  signal: AbortSignal
  gate: PauseControl
  report?: (text: string) => void
}

/** 可被终止打断的睡眠，返回实际睡掉的毫秒数 */
export function sleepOrAbort(ms: number, signal: AbortSignal): Promise<number> {
  return new Promise((resolve) => {
    if (signal.aborted || ms <= 0) {
      resolve(0)
      return
    }
    const started = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const finish = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve(Date.now() - started)
    }
    timer = setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

/** 累加活动时间：暂停期间不推进，返回真正等掉的毫秒数 */
export async function waitFor(run: WaitRun, totalMs: number): Promise<number> {
  let elapsed = 0
  let nextReport = PROGRESS_MS
  while (elapsed < totalMs && !run.signal.aborted) {
    if (run.gate.paused) {
      await run.gate.wait(run.signal)
      continue
    }
    elapsed += await sleepOrAbort(Math.min(TICK_MS, totalMs - elapsed), run.signal)
    if (elapsed >= nextReport) {
      run.report?.(`已等待 ${durationText(elapsed)} / ${durationText(totalMs)}`)
      nextReport += PROGRESS_MS
    }
  }
  return elapsed
}

/**
 * 等到墙钟时刻：暂停不会推迟时间点（外部世界不会等你），
 * 返回从开始调用到现在的毫秒数。
 */
export async function waitUntil(run: WaitRun, targetMs: number): Promise<number> {
  const started = Date.now()
  const total = Math.max(0, targetMs - started)
  let nextReport = PROGRESS_MS
  while (Date.now() < targetMs && !run.signal.aborted) {
    if (run.gate.paused) {
      await run.gate.wait(run.signal)
      continue
    }
    await sleepOrAbort(Math.min(TICK_MS, targetMs - Date.now()), run.signal)
    const elapsed = Date.now() - started
    if (elapsed >= nextReport) {
      run.report?.(`已等待 ${durationText(elapsed)} / ${durationText(total)}`)
      nextReport += PROGRESS_MS
    }
  }
  return Date.now() - started
}
