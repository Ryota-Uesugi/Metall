export {}

declare global {
  interface Window {
    engineAPI: {
      sendCommand: (command: string) => Promise<any>

      onEngineStream: (callback: (data: string) => void) => void

      onLiveTrace?: (callback: (data: string) => void) => void

      selectScriptsFolder: () => Promise<string | null>

      setScriptsFolder: (
        folderPath: string
      ) => Promise<{
        ok: boolean
        folderPath?: string
        error?: string
      }>

      getScriptsFolder: () => Promise<string>
    }
  }
}