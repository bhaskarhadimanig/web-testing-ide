import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
interface RecorderStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'wait';
  timestamp: number;
  url: string;
  viewport: { width: number; height: number };
  selectors: Array<{
    selector: string;
    type: string;
    score: number;
    isUnique: boolean;
  }>;
  value?: any;
  screenshot?: string;
  metadata: {
    tagName: string;
    [key: string]: any;
  };
}

interface RecordingSession {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  steps: RecorderStep[];
  viewport: { width: number; height: number };
  userAgent: string;
  metadata: {
    description: string;
    tags: string[];
    duration: number;
    totalSteps: number;
  };
}

function App() {
  const [activeTab, setActiveTab] = useState<'steps' | 'code'>('steps')
  const [code, setCode] = useState(`// Generated Playwright test will appear here
import { test, expect } from '@playwright/test'

test('recorded session', async ({ page }) => {
})`)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSteps, setRecordingSteps] = useState<RecorderStep[]>([])
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null)

  const handleRecord = async () => {
    try {
      const result = await window.electronAPI.recorder.start('https://demo.playwright.dev', {
        mode: 'playwright',
        headless: false
      })
      if (result.success) {
        setIsRecording(true)
        setRecordingSteps([])
      } else {
        console.error('Failed to start recording:', result.error)
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleStop = async () => {
    try {
      const result = await window.electronAPI.recorder.stop()
      if (result.success && result.session) {
        setIsRecording(false)
        setCurrentSession(result.session as RecordingSession)
        setRecordingSteps(result.session.steps as RecorderStep[])
      } else {
        console.error('Failed to stop recording:', result.error)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const handleGenerate = () => {
    if (currentSession) {
      const generatedCode = generatePlaywrightCode(currentSession)
      setCode(generatedCode)
    }
  }

  const handleRun = () => {
    console.log('Run clicked')
  }

  const handleExport = async () => {
    try {
      const result = await window.electronAPI.recorder.export('json')
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'recording.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export recording:', error)
    }
  }

  const generatePlaywrightCode = (session: RecordingSession): string => {
    let code = `import { test, expect } from '@playwright/test'\n\n`
    code += `test('${session.name}', async ({ page }) => {\n`
    
    session.steps.forEach((step: any) => {
      switch (step.type) {
        case 'navigate':
          code += `  await page.goto('${step.url}')\n`
          break
        case 'click':
          if (step.selectors.length > 0) {
            code += `  await page.click('${step.selectors[0].selector}')\n`
          }
          break
        case 'type':
          if (step.selectors.length > 0 && step.value) {
            code += `  await page.fill('${step.selectors[0].selector}', '${step.value}')\n`
          }
          break
        case 'screenshot':
          code += `  await page.screenshot({ path: '${step.screenshot}' })\n`
          break
      }
    })
    
    code += `})\n`
    return code
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Toolbar */}
      <header className="bg-white shadow-sm border-b px-4 py-2">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">Web Testing IDE</h1>
          <div className="flex space-x-2">
            <button
              onClick={handleRecord}
              disabled={isRecording}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                isRecording 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isRecording ? 'Recording...' : 'Record'}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRecording}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !isRecording 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              Stop
            </button>
            <button
              onClick={handleGenerate}
              disabled={!currentSession}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !currentSession 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Generate
            </button>
            <button
              onClick={handleRun}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Run
            </button>
            <button
              onClick={handleExport}
              disabled={!currentSession}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !currentSession 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex">
        {/* Left Panel - Steps Tree */}
        <div className="w-1/3 bg-white border-r flex flex-col">
          <div className="border-b px-4 py-2 bg-gray-50">
            <h2 className="font-medium text-gray-900">Recording Steps</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {recordingSteps.length === 0 ? (
              <div className="text-gray-500 text-sm">
                {isRecording ? 'Recording in progress...' : 'No recording steps yet. Click "Record" to start capturing interactions.'}
              </div>
            ) : (
              <div className="space-y-2">
                {recordingSteps.map((step, index) => (
                  <div key={step.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {step.type}
                        </span>
                        <span className="text-sm font-medium">Step {index + 1}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {step.url}
                    </div>
                    {step.screenshot && (
                      <div className="mt-2">
                        <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center text-xs text-gray-500">
                          Screenshot
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="border-b bg-gray-50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('steps')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'steps'
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Steps ({recordingSteps.length})
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'code'
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Code
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'steps' ? (
              <div className="h-full p-4 bg-white">
                <div className="text-gray-500 text-sm">
                  Generated code will appear here after clicking Generate.
                </div>
              </div>
            ) : (
              <div className="h-full">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
