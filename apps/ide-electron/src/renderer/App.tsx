import React, { useState } from 'react'
import Editor from '@monaco-editor/react'

function App() {
  const [activeTab, setActiveTab] = useState<'steps' | 'code'>('steps')
  const [code, setCode] = useState(`// Generated Playwright test will appear here
import { test, expect } from '@playwright/test'

test('recorded session', async ({ page }) => {
})`)

  const handleRecord = () => {
    console.log('Record clicked')
  }

  const handleStop = () => {
    console.log('Stop clicked')
  }

  const handleGenerate = () => {
    console.log('Generate clicked')
  }

  const handleRun = () => {
    console.log('Run clicked')
  }

  const handleExport = () => {
    console.log('Export clicked')
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
              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Record
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
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
              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors"
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
          <div className="flex-1 p-4">
            <div className="text-gray-500 text-sm">
              No recording steps yet. Click "Record" to start capturing interactions.
            </div>
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
                Steps
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
                  Visual step editor will be implemented in Phase 2.
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
