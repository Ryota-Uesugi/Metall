import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    
    // ★追加: リアルタイムストリームを受信するためのAPI
    contextBridge.exposeInMainWorld('engineAPI', {
      sendCommand: (command: string) => ipcRenderer.invoke('engine-command', command),
      onEngineStream: (callback: (data: string) => void) => {
        ipcRenderer.on('engine-stream', (_event, value) => callback(value))
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}