import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    
    contextBridge.exposeInMainWorld('engineAPI', {
      sendCommand: (command: string) => ipcRenderer.invoke('engine-command', command),
      onEngineStream: (callback: (data: string) => void) => {
        ipcRenderer.on('engine-stream', (_event, value) => callback(value))
      },
      // ★追加: 9090ポートから受信したライブトレースを購読
      onLiveTrace: (callback: (data: string) => void) => {
        ipcRenderer.on('live-trace', (_event, value) => callback(value))
      }
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