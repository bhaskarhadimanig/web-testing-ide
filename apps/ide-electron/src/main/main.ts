import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { WebSocketServer } from 'ws'
import { RecorderEngine } from '@web-testing-ide/recorder'
import { TestRunner } from '@web-testing-ide/runner'

const isDev = process.env.NODE_ENV === 'development'
let wsServer: WebSocketServer | null = null
const recorder = new RecorderEngine()
const runner = new TestRunner()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupWebSocketServer(): void {
  wsServer = new WebSocketServer({ port: 8080 })
  
  wsServer.on('connection', (ws) => {
    console.log('Extension connected')
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        
        switch (message.type) {
          case 'step':
            console.log('Received step from extension:', message.data)
            break
        }
      } catch (error) {
        console.error('WebSocket message error:', error)
      }
    })
    
    ws.on('close', () => {
      console.log('Extension disconnected')
    })
  })
}

app.whenReady().then(() => {
  createWindow()
  setupWebSocketServer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (wsServer) {
    wsServer.close()
  }
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('ping', () => 'pong')

ipcMain.handle('recorder:start', async (event, url: string, options: any) => {
  try {
    await recorder.startRecording(url, options)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('recorder:stop', async () => {
  try {
    const session = await recorder.stopRecording()
    return { success: true, session }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('recorder:export', async (event, format: string) => {
  try {
    const exported = await recorder.exportRecording(format as 'json')
    return { success: true, data: exported }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('runner:run-test', async (event, testPath: string, options: any) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputDir = `runs/${timestamp}`
    
    const result = await runner.runTest(testPath, {
      ...options,
      outputDir
    })
    
    return { success: true, result, outputDir }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('runner:get-report', async (event, runId: string) => {
  try {
    const reportPath = join(process.cwd(), 'runs', runId, 'report.html')
    return { success: true, reportPath }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
