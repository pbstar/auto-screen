import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { findWindow } from './screen'

const run = promisify(execFile)

/**
 * 把目标窗口所在的应用激活到最前。
 * 动作要落在目标上，前提是目标在最前面。以前靠每次动作前隐藏本窗口来保证，
 * 代价是窗口一直在闪、还抢走焦点打断目标应用；改成开跑时激活一次。
 */
export async function activateWindow(windowId: number): Promise<void> {
  if (process.platform !== 'darwin') {
    // Windows 的 SetForegroundWindow 随 M4 双平台适配一起补
    return
  }

  const pid = findWindow(windowId).pid()
  const script =
    'tell application "System Events" to set frontmost of ' +
    `(first process whose unix id is ${pid}) to true`

  try {
    await run('osascript', ['-e', script], { timeout: 8000 })
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message.split('\n')[0] : String(caught)
    throw new Error(
      `无法把目标窗口激活到最前（${detail}）。` +
        '请到 系统设置 → 隐私与安全性 → 自动化 中允许本应用控制 System Events',
    )
  }
}
