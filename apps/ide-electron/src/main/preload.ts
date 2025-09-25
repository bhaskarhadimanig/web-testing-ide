import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  recorder: {
    start: (url: string, options: any) => ipcRenderer.invoke('recorder:start', url, options),
    stop: () => ipcRenderer.invoke('recorder:stop'),
    export: (format: string) => ipcRenderer.invoke('recorder:export', format)
  },
  runner: {
    runTest: (testPath: string, options: any) => ipcRenderer.invoke('runner:run-test', testPath, options),
    runSingleStep: (step: any, options: any) => ipcRenderer.invoke('runner:run-single-step', step, options),
    getReport: (runId: string) => ipcRenderer.invoke('runner:get-report', runId)
  },
  file: {
    saveCode: (code: string, filename: string) => ipcRenderer.invoke('file:save-code', code, filename),
    openReport: (reportPath: string) => ipcRenderer.invoke('file:open-report', reportPath)
  }
})
