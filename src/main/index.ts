import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn, ChildProcess } from 'child_process'

let engineProcess: ChildProcess | null = null;
let outputBuffer = '';
let commandResolver: ((value: any) => void) | null = null;

function startRustEngine(): void {
  // ※パスはご自身の環境に合わせて適宜確認してください
  const enginePath = 'D:\\Rust\\boxing\\target\\debug\\boxing.exe';
  const targetDir = 'D:\\Rust\\boxing\\scripts'; 
  
  console.log('[Electron] Starting Rust Engine at:', enginePath);

  try {
    engineProcess = spawn(enginePath, [targetDir]);

    engineProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      outputBuffer += text;

      // ★追加: JSONエクスポート中でなければ、随時フロントエンドに送信してストリーム表示させる
      if (!outputBuffer.includes('===JSON_EXPORT_START===')) {
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('engine-stream', text);
        });
      }
      
      if (outputBuffer.includes('===JSON_EXPORT_END===')) {
        if (commandResolver) {
          try {
            const startIndex = outputBuffer.indexOf('===JSON_EXPORT_START===');
            const endIndex = outputBuffer.indexOf('===JSON_EXPORT_END===');

            const consoleOutput = outputBuffer.substring(0, startIndex).trim();

            const jsonStartIndex = startIndex + '===JSON_EXPORT_START==='.length;
            const jsonStr = outputBuffer.substring(jsonStartIndex, endIndex).trim();
            
            const result = JSON.parse(jsonStr);
            result._consoleOutput = consoleOutput;

            commandResolver(result);
          } catch (e) {
            console.error("[Electron] JSON Parse Error:", e);
            commandResolver({ error: "Failed to parse JSON", raw: outputBuffer });
          }
          commandResolver = null;
          outputBuffer = ''; 
        }
      }
    });

    engineProcess.stderr?.on('data', (data) => {
      console.error(`[Rust Engine Error] ${data}`);
    });

    engineProcess.on('close', (code) => {
      console.log(`[Electron] Rust engine process exited with code ${code}`);
    });

  } catch (error) {
    console.error("[Electron] Failed to start Rust engine:", error);
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
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

  startRustEngine()

  ipcMain.handle('engine-command', async (_, command) => {
    return new Promise((resolve) => {
      commandResolver = resolve;
      
      if (engineProcess && engineProcess.stdin) {
        if (command) {
          engineProcess.stdin.write(command + '\n');
        }
        engineProcess.stdin.write('export\n');
      } else {
        resolve({ error: "Rust engine is not running." });
      }
    });
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  if (engineProcess) {
    engineProcess.kill();
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})