import { BrowserWindow, clipboard, ipcMain, systemPreferences } from 'electron'
import { IPC } from '../src/shared/ipc'
import type {
  ClickRequest,
  ClickResult,
  IpcResult,
  KeyRequest,
  PermissionStatus,
  TypeRequest,
} from '../src/shared/types'
import { clickAt, pasteText, pressCombo } from '../src/core/input'
import {
  captureWindow,
  findWindow,
  imageToPhysical,
  listWindows,
  windowScaleFactor,
} from '../src/core/screen'

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function fail(error: unknown): IpcResult<never> {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withWindowHidden<T>(
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

async function runClick(req: ClickRequest): Promise<ClickResult> {
  const win = findWindow(req.windowId)
  const physical = imageToPhysical(win, req.imageWidth, req.imageHeight, req.x, req.y)
  return clickAt(
    physical,
    windowScaleFactor(win),
    req.unitMode ?? 'auto',
    req.button ?? 'left',
    req.count ?? 1,
  )
}

function getPermissions(): PermissionStatus {
  const platform = process.platform
  if (platform !== 'darwin') {
    return { platform, screen: 'granted', accessibility: true }
  }

  let screen = 'unknown'
  try {
    screen = systemPreferences.getMediaAccessStatus('screen')
  } catch {
    // 权限接口在极少数系统版本上不可用，保持 unknown
  }

  let accessibility = false
  try {
    accessibility = systemPreferences.isTrustedAccessibilityClient(false)
  } catch {
    // 同上
  }

  return { platform, screen, accessibility }
}

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.listWindows, () => {
    try {
      return ok(listWindows(process.pid))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.capture, (_event, windowId: number) => {
    try {
      return ok(captureWindow(windowId))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.click, async (_event, req: ClickRequest) => {
    try {
      const result = await withWindowHidden(getMainWindow(), req.hideWindow !== false, () =>
        runClick(req),
      )
      return ok(result)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.typeText, async (_event, req: TypeRequest) => {
    try {
      await withWindowHidden(getMainWindow(), req.hideWindow !== false, async () => {
        if (req.click) await runClick(req.click)
        await pasteText(req.text)
      })
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.pressKey, async (_event, req: KeyRequest) => {
    try {
      await withWindowHidden(getMainWindow(), req.hideWindow !== false, () => pressCombo(req.combo))
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.copyText, async (_event, text: string) => {
    try {
      await clipboard.writeText(text)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.permissions, () => {
    try {
      return ok(getPermissions())
    } catch (error) {
      return fail(error)
    }
  })
}
