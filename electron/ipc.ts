import { BrowserWindow, clipboard, ipcMain, systemPreferences } from 'electron'
import { IPC } from '../src/shared/ipc'
import type { IpcResult, PermissionStatus, ToolExecuteRequest } from '../src/shared/types'
import { captureWindow, listWindows } from '../src/core/screen'
import { withWindowHidden } from '../src/core/safety'
import { executeTool } from './agent/registry'

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function fail(error: unknown): IpcResult<never> {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
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

  ipcMain.handle(IPC.executeTool, async (_event, req: ToolExecuteRequest) => {
    try {
      const result = await withWindowHidden(getMainWindow(), req.hideWindow !== false, () =>
        executeTool(req.name, req.input, req.context),
      )
      return ok(result)
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
