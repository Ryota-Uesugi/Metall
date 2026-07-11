// index.ts
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'
import * as dgram from 'dgram'
import * as fs from 'fs'
import * as net from 'net' // ★ TCP通信用に追加

let engineProcess: ChildProcess | null = null
let outputBuffer = ''
let commandResolver: ((value: any) => void) | null = null

let commandQueue: { command: string, resolve: (val: any) => void }[] = []
let isProcessing = false

let cmdClient: net.Socket | null = null // ★ CMD用TCPクライアント

const isPackaged = app.isPackaged;
const engineExecutable = process.platform === 'win32' ? 'boxing.exe' : 'boxing';

const enginePath = isPackaged
  ? join(process.resourcesPath, 'bin', engineExecutable)
  : 'D:\\Rust\\boxing\\target\\debug\\boxing.exe';

let currentScriptsDir = isPackaged
  ? join(process.resourcesPath, 'scripts')
  : 'D:\\Rust\\boxing\\scripts';

// ★ TCP 9092 に接続するクライアント関数
function connectToCmdServer() {
  if (cmdClient) return;

  cmdClient = new net.Socket();
  cmdClient.connect(9092, '127.0.0.1', () => {
    console.log('[Electron] Connected to Boxy Engine CMD Server (TCP 9092)');
  });

  cmdClient.on('data', (data) => {
    const text = data.toString();
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('cmd-output', text);
    });
  });

  cmdClient.on('error', () => {
    cmdClient?.destroy();
    cmdClient = null;
    // エンジンがまだ起動中の場合はリトライ
    if (engineProcess && !engineProcess.killed) {
      setTimeout(connectToCmdServer, 1000);
    }
  });

  cmdClient.on('close', () => {
    cmdClient = null;
    if (engineProcess && !engineProcess.killed) {
      setTimeout(connectToCmdServer, 1000);
    }
  });
}

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
  if (cmdClient) {
    cmdClient.destroy();
    cmdClient = null;
  }

  if (engineProcess) {
    engineProcess.kill()
    engineProcess = null
  }
  outputBuffer = ''
  
  if (commandResolver) {
    commandResolver({ error: 'Engine stopped' })
    commandResolver = null
  }
  
  commandQueue.forEach(t => t.resolve({ error: 'Engine stopped' }))
  commandQueue = []
  isProcessing = false
}

function processQueue() {
  if (isProcessing || commandQueue.length === 0) return;
  isProcessing = true;

  const task = commandQueue.shift()!;
  commandResolver = task.resolve;

  if (engineProcess && engineProcess.stdin && !engineProcess.killed) {
    if (task.command) {
      engineProcess.stdin.write(task.command + '\n');
    } else {
      engineProcess.stdin.write('\n');
    }
  } else {
    task.resolve({ error: 'Rust engine is not running or stdin is closed.' });
    commandResolver = null;
    isProcessing = false;
    processQueue();
  }
}

function startRustEngine(targetDir: string = currentScriptsDir): void {
  currentScriptsDir = targetDir
  console.log('[Electron] Starting Rust Engine at:', enginePath)

  if (!fs.existsSync(enginePath)) {
    console.error(`[Electron] ERROR: Engine executable not found at ${enginePath}`);
    dialog.showErrorBox('Engine Not Found', `Rust engine (boxing) was not found at:\n${enginePath}\n\nPlease check the path.`);
    return;
  }

  try {
    engineProcess = spawn(enginePath, [currentScriptsDir], {
      cwd: join(currentScriptsDir, '..')
    })

    // エンジンのTCPサーバー起動を待ってから接続を試みる
    setTimeout(connectToCmdServer, 1000);

    engineProcess.on('error', (err) => {
      console.error(`[Electron] Failed to start Rust engine:`, err);
      if (commandResolver) {
        commandResolver({ error: `Engine failed to start: ${err.message}` });
        commandResolver = null;
      }
      isProcessing = false;
    });

    engineProcess.stdout?.on('data', (data) => {
      outputBuffer += data.toString();

      let endIdx;
      while ((endIdx = outputBuffer.indexOf('===CMD_END===')) !== -1) {
        const chunk = outputBuffer.substring(0, endIdx).trim();
        outputBuffer = outputBuffer.substring(endIdx + '===CMD_END==='.length);

        if (commandResolver) {
          commandResolver({ raw: chunk });
          commandResolver = null;
          isProcessing = false;
          processQueue();
        }
      }
    })

    engineProcess.stderr?.on('data', (data) => {
      console.error(`[Rust Engine Error] ${data}`)
    })

    engineProcess.on('close', (code, signal) => {
      console.log(`[Electron] Rust engine process exited. Code: ${code}, Signal: ${signal}`)
      if (commandResolver) {
        commandResolver({ error: `Engine exited (Code: ${code}, Signal: ${signal})` })
        commandResolver = null
      }
      commandQueue.forEach(t => t.resolve({ error: `Engine exited (Code: ${code}, Signal: ${signal})` }))
      commandQueue = []
      isProcessing = false
    })
  } catch (error) {
    console.error('[Electron] Failed to spawn Rust engine process:', error)
  }
}

function restartRustEngine(targetDir: string): void {
  stopRustEngine()
  startRustEngine(targetDir)
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 500,
    show: false, autoHideMenuBar: true, titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#1f1f1f', symbolColor: '#cccccc', height: 30 },
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  mainWindow.on('ready-to-show', () => mainWindow.show())
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
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  startTraceServer()
  startRustEngine(currentScriptsDir)

  ipcMain.handle('engine-command', async (_, command: string) => {
    return new Promise((resolve) => {
      commandQueue.push({ command, resolve })
      processQueue()
    })
  })

  // ★ フロントエンドからのCMD入力をTCPサーバーに送信
  ipcMain.handle('engine:cmd-input', async (_, text: string) => {
    if (cmdClient && !cmdClient.destroyed) {
      cmdClient.write(text + '\n');
    }
  })

  ipcMain.handle('dialog:select-scripts-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Scripts folder を選択',
      defaultPath: currentScriptsDir,
      buttonLabel: 'このフォルダを使用',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('engine:set-scripts-folder', async (_, folderPath: string) => {
    if (!folderPath) return { ok: false, error: 'Folder path is empty.' }
    restartRustEngine(folderPath)
    return { ok: true, folderPath }
  })

  ipcMain.handle('engine:get-scripts-folder', async () => currentScriptsDir)

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => stopRustEngine())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })