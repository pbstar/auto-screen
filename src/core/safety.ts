import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { findWindow } from './screen'

const run = promisify(execFile)

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const POLL_MS = 150
const MAX_POLLS = 10

function activateScript(pid: number): string {
  return (
    'tell application "System Events" to set frontmost of ' +
    `(first process whose unix id is ${pid}) to true`
  )
}

function frontmostScript(pid: number): string {
  return (
    'tell application "System Events" to get frontmost of ' +
    `(first process whose unix id is ${pid})`
  )
}

async function isFrontmost(pid: number): Promise<boolean> {
  const { stdout } = await run('osascript', ['-e', frontmostScript(pid)], { timeout: 5000 })
  return stdout.trim() === 'true'
}

/** 激活可能滞后于命令返回，轮询确认，避免第一次点击被窗口激活吞掉 */
async function waitFrontmost(pid: number): Promise<boolean> {
  for (let i = 0; i < MAX_POLLS; i += 1) {
    if (await isFrontmost(pid)) return true
    await delay(POLL_MS)
  }
  return false
}

/**
 * 把目标窗口所在的应用激活到最前，并确认它真的成了前台应用。
 * 动作要落在目标上，前提是目标在最前面。以前靠每次动作前隐藏本窗口来保证，
 * 代价是窗口一直在闪、还抢走焦点打断目标应用；改成开跑时激活并确认。
 */
export async function activateWindow(windowId: number): Promise<void> {
  if (process.platform !== 'darwin') {
    // Windows 的 SetForegroundWindow 随 M4 双平台适配一起补
    return
  }

  const pid = findWindow(windowId).pid()
  try {
    await run('osascript', ['-e', activateScript(pid)], { timeout: 8000 })
    if (await waitFrontmost(pid)) return
    await run('osascript', ['-e', activateScript(pid)], { timeout: 8000 })
    if (await waitFrontmost(pid)) return
    throw new Error('目标应用没有切到前台')
  } catch (caught) {
    const detail = caught instanceof Error ? caught.message.split('\n')[0] : String(caught)
    throw new Error(
      `无法把目标窗口激活到最前（${detail}）。` +
        '请到 系统设置 → 隐私与安全性 → 自动化 中允许本应用控制 System Events',
    )
  }
}
