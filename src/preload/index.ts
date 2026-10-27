import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/ipc'
import type { AgentAnswer, AgentEvent, AgentStartRequest } from '../shared/agent'
import type { AutoScreenApi } from '../shared/types'

const api: AutoScreenApi = {
  listWindows: () => ipcRenderer.invoke(IPC.listWindows),
  setStreamTarget: (windowId: number | null) =>
    ipcRenderer.invoke(IPC.streamTarget, windowId),
  listTools: () => ipcRenderer.invoke(IPC.toolsList),
  listSkills: () => ipcRenderer.invoke(IPC.skillsList),
  listRules: () => ipcRenderer.invoke(IPC.rulesList),
  permissions: () => ipcRenderer.invoke(IPC.permissions),
  startAgent: (request: AgentStartRequest) => ipcRenderer.invoke(IPC.agentStart, request),
  stopAgent: () => ipcRenderer.invoke(IPC.agentStop),
  pauseAgent: () => ipcRenderer.invoke(IPC.agentPause),
  resumeAgent: () => ipcRenderer.invoke(IPC.agentResume),
  answerAgentQuestion: (payload: AgentAnswer) => ipcRenderer.invoke(IPC.agentAnswer, payload),
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
