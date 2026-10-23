import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../src/shared/ipc'
import type {
  AutoScreenApi,
  ClickRequest,
  KeyRequest,
  TypeRequest,
} from '../src/shared/types'

const api: AutoScreenApi = {
  listWindows: () => ipcRenderer.invoke(IPC.listWindows),
  capture: (windowId: number) => ipcRenderer.invoke(IPC.capture, windowId),
  click: (request: ClickRequest) => ipcRenderer.invoke(IPC.click, request),
  typeText: (request: TypeRequest) => ipcRenderer.invoke(IPC.typeText, request),
  pressKey: (request: KeyRequest) => ipcRenderer.invoke(IPC.pressKey, request),
  copyText: (text: string) => ipcRenderer.invoke(IPC.copyText, text),
  permissions: () => ipcRenderer.invoke(IPC.permissions),
}

contextBridge.exposeInMainWorld('autoScreen', api)
