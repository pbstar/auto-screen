import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../src/shared/ipc'
import type { AgentEvent, AgentStartRequest } from '../src/shared/agent'
import type { AutoScreenApi } from '../src/shared/types'

const api: AutoScreenApi = {
  listWindows: () => ipcRenderer.invoke(IPC.listWindows),
  capture: (windowId: number) => ipcRenderer.invoke(IPC.capture, windowId),
  listTools: () => ipcRenderer.invoke(IPC.toolsList),
  permissions: () => ipcRenderer.invoke(IPC.permissions),
  startAgent: (request: AgentStartRequest) => ipcRenderer.invoke(IPC.agentStart, request),
  stopAgent: () => ipcRenderer.invoke(IPC.agentStop),
  agentStatus: () => ipcRenderer.invoke(IPC.agentStatus),
  onAgentEvent: (listener: (event: AgentEvent) => void) => {
    const handler = (_event: IpcRendererEvent, payload: AgentEvent) => listener(payload)
    ipcRenderer.on(IPC.agentEvent, handler)
    return () => ipcRenderer.removeListener(IPC.agentEvent, handler)
  },
}

contextBridge.exposeInMainWorld('autoScreen', api)
