import { useState } from 'react'

// TypeScriptに window.electron が存在することを教えるための宣言（型拡張）
declare global {
  interface Window {
    electron: any;
  }
}

function Versions() {
  const [versions] = useState({
    node: window.electron.process.versions.node,
    chrome: window.electron.process.versions.chrome,
    electron: window.electron.process.versions.electron,
    v8: window.electron.process.versions.v8,
    os: window.electron.process.getOSVersion()
  })

  return (
    <ul className="versions">
      <li className="node-version">Node v{versions.node}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="v8-version">V8 v{versions.v8}</li>
      <li className="os-version">OS {versions.os}</li>
    </ul>
  )
}

export default Versions