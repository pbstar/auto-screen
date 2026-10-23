import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../src/shared/ipc'
import type { AgentEvent, AgentStartRequest } from '../src/shared/agent'
import type { AutoScreenApi } from '../src/shared/types'

const api: AutoScreenApi = {
  listWindows: () => ipcRenderer.invoke(IPC.listWindows),
  setStreamTarget: (windowId: number | null) =>
    ipcRenderer.invoke(IPC.streamTarget, windowId),
  listTools: () => ipcRenderer.invoke(IPC.toolsList),
  permissions: () => ipcRenderer.invoke(IPC.permissions),
  startAgent: (request: AgentStartRequest) => ipcRenderer.invoke(IPC.agentStart, request),
  stopAgent: () => ipcRenderer.invoke(IPC.agentStop),
  pauseAgent: () => ipcRenderer.invoke(IPC.agentPause),
  resumeAgent: () => ipcRenderer.invoke(IPC.agentResume),
  agentStatus: () => ipcRenderer.invoke(IPC.agentStatus),
  onAgentEvent: (listener: (event: AgentEvent) => void) => {
    const handler = (_event: IpcRendererEvent, payload: AgentEvent) => listener(payload)
    ipcRenderer.on(IPC.agentEvent, handler)
    return () => ipcRenderer.removeListener(IPC.agentEvent, handler)
  },
  listRuns: () => ipcRenderer.invoke(IPC.runsList),
  readRun: (name: string) => ipcRenderer.invoke(IPC.runsRead, name),
  readRunShot: (runId: string, step: number) => ipcRenderer.invoke(IPC.runsShot, runId, step),
  openRunsDir: () => ipcRenderer.invoke(IPC.runsOpenDir),
}

contextBridge.exposeInMainWorld('autoScreen', api)
