import { BrowserWindow, ipcMain, shell, systemPreferences } from 'electron'
import { IPC } from '../shared/ipc'
import type { AgentAnswer, AgentStartRequest } from '../shared/agent'
import type { IpcResult, ModelSettingsInput, PermissionStatus } from '../shared/types'
import { readModelSettings, saveModelSettings } from './config'
import { listWindows } from '../core/screen'
import { setStreamTarget } from './capture-stream'
import { listToolSummaries } from '../agent/tools'
import {
  agentStatus,
  answerAgent,
  pauseAgent,
  resumeAgent,
  startAgent,
  stopAgent,
} from '../agent/service'
import { ensureRunsRoot, listRuns, readRun, readShot, runsRoot } from '../agent/run-store'
import { listSkills } from '../agent/skills'

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

  ipcMain.handle(IPC.streamTarget, async (_event, windowId: number | null) => {
    try {
      return ok(await setStreamTarget(windowId))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.toolsList, () => {
    try {
      return ok(listToolSummaries())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.skillsList, () => {
    try {
      return ok(listSkills())
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

  ipcMain.handle(IPC.configGet, () => {
    try {
      return ok(readModelSettings())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.configSave, (_event, input: ModelSettingsInput) => {
    try {
      return ok(saveModelSettings(input))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentStart, async (_event, request: AgentStartRequest) => {
    try {
      await startAgent(getMainWindow, request)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentStop, () => {
    try {
      stopAgent(getMainWindow)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentPause, () => {
    try {
      pauseAgent(getMainWindow)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentResume, async () => {
    try {
      await resumeAgent(getMainWindow)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentAnswer, async (_event, payload: AgentAnswer) => {
    try {
      await answerAgent(payload)
      return ok(null)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.agentStatus, () => {
    try {
      return ok(agentStatus())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.runsList, () => {
    try {
      return ok(listRuns())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.runsRead, (_event, name: string) => {
    try {
      return ok(readRun(name))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.runsShot, (_event, runId: string, step: number) => {
    try {
      return ok(readShot(runId, step))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC.runsOpenDir, async () => {
    try {
      ensureRunsRoot()
      const error = await shell.openPath(runsRoot())
      if (error) throw new Error(error)
      return ok(null)
    } catch (caught) {
      return fail(caught)
    }
  })
}
