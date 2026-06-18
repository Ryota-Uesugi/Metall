import { contextBridge, ipcRenderer } from 'electron'

// 既存のAPI定義があれば残しつつ、engineAPI を追加します
contextBridge.exposeInMainWorld('engineAPI', {
  // Rustエンジンにコマンドを送り、結果のJSONを受け取る関数
  sendCommand: (command: string) => ipcRenderer.invoke('engine-command', command)
})