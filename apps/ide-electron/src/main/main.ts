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
    if (!process.env.DISPLAY) {
      console.log('No display server detected, forcing headless mode')
      options.headless = true
    }
    await recorder.startRecording(url, options)
    return { success: true }
  } catch (error) {
    console.error('Recording start error:', error)
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

ipcMain.handle('runner:run-test', async (event, testPathOrCode: string, options: any) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputDir = join(process.cwd(), 'runs', timestamp)
    
    let result
    if (options.isGeneratedCode) {
      result = await runner.runGeneratedTest(testPathOrCode, { ...options, outputDir })
    } else {
      result = await runner.runTest(testPathOrCode, { ...options, outputDir })
    }
    
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

ipcMain.handle('runner:run-single-step', async (event, step: any, options: any) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputDir = join(process.cwd(), 'runs', `step-${timestamp}`)
    
    const result = await runner.runSingleStep(step, {
      ...options,
      outputDir
    })
    
    return { success: true, result, outputDir }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file:save-code', async (event, code: string, filename: string) => {
  try {
    const { dialog } = require('electron')
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [
        { name: 'TypeScript', extensions: ['ts'] },
        { name: 'JavaScript', extensions: ['js'] },
        { name: 'Python', extensions: ['py'] },
        { name: 'Java', extensions: ['java'] }
      ]
    })
    
    if (filePath) {
      const fs = require('fs').promises
      await fs.writeFile(filePath, code, 'utf-8')
      return { success: true, filePath }
    }
    return { success: false, error: 'Save cancelled' }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle('file:open-report', async (event, reportPath: string) => {
  try {
    const { shell } = require('electron')
    const fs = require('fs')
    
    if (!fs.existsSync(reportPath)) {
      return { success: false, error: `Report file not found: ${reportPath}` }
    }
    
    await shell.openPath(reportPath)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})
