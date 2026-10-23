import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../src/shared/ipc'
import type { AutoScreenApi, ToolExecuteRequest } from '../src/shared/types'

const api: AutoScreenApi = {
  listWindows: () => ipcRenderer.invoke(IPC.listWindows),
  capture: (windowId: number) => ipcRenderer.invoke(IPC.capture, windowId),
  executeTool: (request: ToolExecuteRequest) =>
    ipcRenderer.invoke(IPC.executeTool, request),
  copyText: (text: string) => ipcRenderer.invoke(IPC.copyText, text),
  permissions: () => ipcRenderer.invoke(IPC.permissions),
}

contextBridge.exposeInMainWorld('autoScreen', api)
