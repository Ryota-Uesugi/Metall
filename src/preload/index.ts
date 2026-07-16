// preload_index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    contextBridge.exposeInMainWorld('engineAPI', {
      sendCommand: (command: string) =>
        ipcRenderer.invoke('engine-command', command),

      onEngineStream: (callback: (data: string) => void) => {
        ipcRenderer.removeAllListeners('engine-stream')
        ipcRenderer.on('engine-stream', (_event, value) => callback(value))
      },

      onLiveTrace: (callback: (data: string) => void) => {
        ipcRenderer.removeAllListeners('live-trace')
        ipcRenderer.on('live-trace', (_event, value) => callback(value))
      },

      selectScriptsFolder: () =>
        ipcRenderer.invoke('dialog:select-scripts-folder'),

      setScriptsFolder: (folderPath: string) =>
        ipcRenderer.invoke('engine:set-scripts-folder', folderPath),

      getScriptsFolder: () =>
        ipcRenderer.invoke('engine:get-scripts-folder'),

      onCmdOutput: (callback: (data: string) => void) => {
        ipcRenderer.removeAllListeners('cmd-output')
        ipcRenderer.on('cmd-output', (_event, value) => callback(value))
      },

      sendCmdInput: (text: string) =>
        ipcRenderer.invoke('engine:cmd-input', text),

      // ★ 追加: メインプロセスにエクスプローラーを開くよう依頼するAPI
      openInExplorer: (path: string) =>
        ipcRenderer.invoke('open-in-explorer', path)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI

  // @ts-ignore
  window.api = api
}