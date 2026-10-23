import type { BrowserWindow } from 'electron'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * 执行鼠标键盘动作前暂时隐藏本窗口，避免动作落在自己身上；
 * 结束后恢复原来的可见状态。
 */
export async function withWindowHidden<T>(
  win: BrowserWindow | null,
  hide: boolean,
  action: () => Promise<T>,
): Promise<T> {
  if (!win || !hide) return action()

  const wasVisible = win.isVisible()
  win.hide()
  await delay(250)
  try {
    return await action()
  } finally {
    if (wasVisible) {
      win.show()
      win.focus()
    }
  }
}
