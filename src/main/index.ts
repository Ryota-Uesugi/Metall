import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import * as dgram from 'dgram'

let engineProcess: ChildProcess | null = null
let outputBuffer = ''
let commandResolver: ((value: any) => void) | null = null

// パッケージ化されているかどうかを判定
const isPackaged = app.isPackaged;
const engineExecutable = process.platform === 'win32' ? 'boxing.exe' : 'boxing';

// ★開発中は元のローカルパスを直接叩き、パッケージ化後は同梱ファイルを見る
const enginePath = isPackaged
  ? join(process.resourcesPath, 'bin', engineExecutable)
  : 'D:\\Rust\\boxing\\target\\debug\\boxing.exe';

// スクリプトフォルダも同様
let currentScriptsDir = isPackaged
  ? join(process.resourcesPath, 'scripts')
  : 'D:\\Rust\\boxing\\scripts';

function startTraceServer(): void {
  const server = dgram.createSocket('udp4')

  server.on('message', (msg) => {
    const text = msg.toString()

    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('live-trace', text)
    })
  })

  server.on('error', (err) => {
    console.error(`[Electron] UDP Trace Server Error:\n${err.stack}`)
    server.close()
  })

  server.bind(9090, '127.0.0.1', () => {
    console.log('[Electron] UDP Trace server listening on 127.0.0.1:9090')
  })
}

function stopRustEngine(): void {
  if (engineProcess) {
    engineProcess.kill()
    engineProcess = null
  }

  outputBuffer = ''
  commandResolver = null
}

function startRustEngine(targetDir: string = currentScriptsDir): void {
  currentScriptsDir = targetDir

  console.log('[Electron] Starting Rust Engine at:', enginePath)
  console.log('[Electron] Scripts Dir:', currentScriptsDir)

  try {
    engineProcess = spawn(enginePath, [currentScriptsDir])

    engineProcess.stdout?.on('data', (data) => {
      const text = data.toString()
      outputBuffer += text

      if (outputBuffer.includes('===JSON_EXPORT_END===')) {
        if (commandResolver) {
          try {
            const startIndex = outputBuffer.indexOf('===JSON_EXPORT_START===')
            const endIndex = outputBuffer.indexOf('===JSON_EXPORT_END===')

            const consoleOutput = outputBuffer.substring(0, startIndex).trim()

            const jsonStartIndex =
              startIndex + '===JSON_EXPORT_START==='.length

            const jsonStr = outputBuffer
              .substring(jsonStartIndex, endIndex)
              .trim()

            const result = JSON.parse(jsonStr)
            result._consoleOutput = consoleOutput

            commandResolver(result)
          } catch (e) {
            console.error('[Electron] JSON Parse Error:', e)

            commandResolver({
              error: 'Failed to parse JSON',
              raw: outputBuffer
            })
          }

          commandResolver = null
          outputBuffer = ''
        }
      }
    })

    engineProcess.stderr?.on('data', (data) => {
      console.error(`[Rust Engine Error] ${data}`)
    })

    engineProcess.on('close', (code) => {
      console.log(`[Electron] Rust engine process exited with code ${code}`)
    })
  } catch (error) {
    console.error('[Electron] Failed to start Rust engine:', error)
  }
}

function restartRustEngine(targetDir: string): void {
  stopRustEngine()
  startRustEngine(targetDir)
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,

    // ★重要:
    // frame: false は使わない。
    // OS標準の閉じる・最大化・最小化ボタンを残しつつ、
    // 標準タイトルバー部分だけを隠す。
    titleBarStyle: 'hidden',

    // ★Windows/Linux向け:
    // OS標準ウィンドウボタンの背景色・記号色・高さを指定。
    titleBarOverlay: {
      color: '#1f1f1f',
      symbolColor: '#cccccc',
      height: 30
    },

    backgroundColor: '#1e1e1e',

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  startTraceServer()
  startRustEngine(currentScriptsDir)

  ipcMain.handle('engine-command', async (_, command: string) => {
    return new Promise((resolve) => {
      commandResolver = resolve

      if (engineProcess && engineProcess.stdin) {
        if (command) {
          engineProcess.stdin.write(command + '\n')
        }

        engineProcess.stdin.write('export\n')
      } else {
        resolve({
          error: 'Rust engine is not running.'
        })
      }
    })
  })

  ipcMain.handle('dialog:select-scripts-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Scripts folder を選択',
      defaultPath: currentScriptsDir,
      buttonLabel: 'このフォルダを使用',
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('engine:set-scripts-folder', async (_, folderPath: string) => {
    if (!folderPath) {
      return {
        ok: false,
        error: 'Folder path is empty.'
      }
    }

    restartRustEngine(folderPath)

    return {
      ok: true,
      folderPath
    }
  })

  ipcMain.handle('engine:get-scripts-folder', async () => {
    return currentScriptsDir
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  stopRustEngine()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})