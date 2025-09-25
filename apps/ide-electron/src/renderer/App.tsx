import React, { useState, useEffect, useCallback } from 'react'
import { MonacoEditor } from './components/MonacoEditor'
import { AssertionBuilder } from './components/AssertionBuilder'
import { StepCard } from './components/StepCard'
import { TestProgress } from './components/TestProgress'
import { useHistory } from './hooks/useHistory'
import { RecorderStep, RecordingSession, AssertionData } from '@web-testing-ide/common'

function App() {
  const [activeTab, setActiveTab] = useState<'steps' | 'code'>('steps')
  const [code, setCode] = useState(`// Generated Playwright test will appear here
import { test, expect } from '@playwright/test'

test('recorded session', async ({ page }) => {
})`)
  const [isCodeModified, setIsCodeModified] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [framework, setFramework] = useState<'playwright' | 'cypress' | 'selenium'>('playwright')
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python'>('typescript')
  const [isRecording, setIsRecording] = useState(false)
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [showAssertionBuilder, setShowAssertionBuilder] = useState(false)
  const [editingStep, setEditingStep] = useState<RecorderStep | null>(null)
  const [testProgress, setTestProgress] = useState({ progress: 0, currentStep: '' })
  const [recordingUrl, setRecordingUrl] = useState('https://demo.playwright.dev')
  
  const {
    state: recordingSteps,
    set: setRecordingSteps,
    undo: undoSteps,
    redo: redoSteps,
    canUndo,
    canRedo,
    reset: resetSteps
  } = useHistory<RecorderStep[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoSteps()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redoSteps()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoSteps, redoSteps])

  const handleRecord = async () => {
    if (!recordingUrl.trim()) {
      alert('Please enter a URL to record')
      return
    }

    try {
      const result = await window.electronAPI.recorder.start(recordingUrl, {
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
        resetSteps(result.session.steps as RecorderStep[])
      } else {
        console.error('Failed to stop recording:', result.error)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const handleGenerate = () => {
    if (currentSession) {
      const newCode = generateCode({ ...currentSession, steps: recordingSteps }, framework, language)
      setCode(newCode)
      setGeneratedCode(newCode)
      setIsCodeModified(false)
    }
  }

  const handleRegenerateFromSteps = () => {
    if (currentSession) {
      const newCode = generateCode({ ...currentSession, steps: recordingSteps }, framework, language)
      setCode(newCode)
      setGeneratedCode(newCode)
      setIsCodeModified(false)
    }
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    setIsCodeModified(newCode !== generatedCode)
  }

  const handleRun = async () => {
    if (!currentSession) {
      console.error('No session to run')
      return
    }

    setIsRunning(true)
    setRunResult(null)
    setTestProgress({ progress: 0, currentStep: 'Initializing test...' })

    try {
      console.log('Starting test run...')
      setTestProgress({ progress: 25, currentStep: 'Running test steps...' })
      
      const result = await window.electronAPI.runner.runTest('examples/generated/demo.test.ts', {
        headless: true
      })
      
      setTestProgress({ progress: 75, currentStep: 'Collecting results...' })
      
      if (result.success) {
        console.log('Test run completed:', result.result)
        console.log('Report available at:', result.outputDir + '/report.html')
        setRunResult({
          status: result.result.status,
          outputDir: result.outputDir,
          reportPath: `${result.outputDir}/report.html`
        })
        
        const reportResult = await window.electronAPI.runner.getReport(result.result.id)
        if (reportResult.success) {
          console.log('HTML Report path:', reportResult.reportPath)
        }
        setTestProgress({ progress: 100, currentStep: 'Test completed!' })
      } else {
        console.error('Test run failed:', result.error)
        setRunResult({
          status: 'failed',
          error: result.error
        })
      }
    } catch (error) {
      console.error('Failed to run test:', error)
      setRunResult({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsRunning(false)
      setTimeout(() => setTestProgress({ progress: 0, currentStep: '' }), 2000)
    }
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

  const generateCode = (session: RecordingSession, fw: string, lang: string): string => {
    switch (fw) {
      case 'playwright':
        return generatePlaywrightCode(session, lang)
      case 'cypress':
        return generateCypressCode(session, lang)
      case 'selenium':
        return generateSeleniumCode(session, lang)
      default:
        return generatePlaywrightCode(session, lang)
    }
  }

  const generatePlaywrightCode = (session: RecordingSession, lang: string): string => {
    let code = `import { test, expect } from '@playwright/test'\n\n`
    code += `test('${session.name}', async ({ page }) => {\n`
    
    session.steps.forEach((step: RecorderStep) => {
      const selector = step.selectors[0]?.selector || 'body'
      
      switch (step.type) {
        case 'navigate':
          code += `  await page.goto('${step.url}')\n`
          break
        case 'click':
          code += `  await page.click('${selector}')\n`
          break
        case 'type':
          if (step.value) {
            code += `  await page.fill('${selector}', '${step.value}')\n`
          }
          break
        default:
          if (step.type === 'assertion' && (step as any).assertion) {
            const assertion = (step as any).assertion
            switch (assertion.type) {
              case 'exists':
              case 'visible':
                code += `  await expect(page.locator('${selector}')).toBeVisible()\n`
                break
              case 'containsText':
                code += `  await expect(page.locator('${selector}')).toContainText('${assertion.expectedValue}')\n`
                break
              case 'urlContains':
                code += `  await expect(page).toHaveURL(/${assertion.expectedValue}/)\n`
                break
            }
          }
          break
        case 'screenshot':
          code += `  await page.screenshot({ path: '${step.screenshot}' })\n`
          break
        case 'wait':
          code += `  await page.waitForTimeout(${step.value || 1000})\n`
          break
      }
    })
    
    code += `})\n`
    return code
  }

  const generateCypressCode = (session: RecordingSession, lang: string): string => {
    let code = `describe('${session.name}', () => {\n`
    code += `  it('${session.name}', () => {\n`
    
    session.steps.forEach((step: RecorderStep) => {
      const selector = step.selectors[0]?.selector || 'body'
      
      switch (step.type) {
        case 'navigate':
          code += `    cy.visit('${step.url}')\n`
          break
        case 'click':
          code += `    cy.get('${selector}').click()\n`
          break
        case 'type':
          if (step.value) {
            code += `    cy.get('${selector}').type('${step.value}')\n`
          }
          break
        default:
          if (step.type === 'assertion' && (step as any).assertion) {
            const assertion = (step as any).assertion
            switch (assertion.type) {
              case 'exists':
              case 'visible':
                code += `    cy.get('${selector}').should('be.visible')\n`
                break
              case 'containsText':
                code += `    cy.get('${selector}').should('contain.text', '${assertion.expectedValue}')\n`
                break
              case 'urlContains':
                code += `    cy.url().should('include', '${assertion.expectedValue}')\n`
                break
            }
          }
          break
        case 'screenshot':
          code += `    cy.screenshot('${step.screenshot}')\n`
          break
        case 'wait':
          code += `    cy.wait(${step.value || 1000})\n`
          break
      }
    })
    
    code += `  })\n})\n`
    return code
  }

  const generateSeleniumCode = (session: RecordingSession, lang: string): string => {
    let code = `from selenium import webdriver\n`
    code += `from selenium.webdriver.common.by import By\n`
    code += `from selenium.webdriver.support.ui import WebDriverWait\n`
    code += `from selenium.webdriver.support import expected_conditions as EC\n`
    code += `import time\n\n`
    code += `class Test${session.name.replace(/\s+/g, '')}:\n`
    code += `    def setup_method(self):\n`
    code += `        self.driver = webdriver.Chrome()\n`
    code += `        self.wait = WebDriverWait(self.driver, 30)\n\n`
    code += `    def test_${session.name.toLowerCase().replace(/\s+/g, '_')}(self):\n`
    
    session.steps.forEach((step: RecorderStep) => {
      const selector = step.selectors[0]?.selector || 'body'
      
      switch (step.type) {
        case 'navigate':
          code += `        self.driver.get('${step.url}')\n`
          break
        case 'click':
          code += `        self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}'))).click()\n`
          break
        case 'type':
          if (step.value) {
            code += `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))\n`
            code += `        element.clear()\n`
            code += `        element.send_keys('${step.value}')\n`
          }
          break
        default:
          if (step.type === 'assertion' && (step as any).assertion) {
            const assertion = (step as any).assertion
            switch (assertion.type) {
              case 'exists':
              case 'visible':
                code += `        assert self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '${selector}')))\n`
                break
              case 'containsText':
                code += `        assert '${assertion.expectedValue}' in self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}'))).text\n`
                break
              case 'urlContains':
                code += `        assert '${assertion.expectedValue}' in self.driver.current_url\n`
                break
            }
          }
          break
        case 'screenshot':
          code += `        self.driver.save_screenshot('${step.screenshot}')\n`
          break
        case 'wait':
          code += `        time.sleep(${(Number(step.value) || 1000) / 1000})\n`
          break
      }
    })
    
    code += `\n    def teardown_method(self):\n`
    code += `        self.driver.quit()\n`
    return code
  }

  const handleAddAssertion = () => {
    setShowAssertionBuilder(true)
    setEditingStep(null)
  }

  const handleSaveAssertion = (assertion: AssertionData) => {
    const newStep: RecorderStep = {
      id: `assertion-${Date.now()}`,
      type: 'assertion',
      timestamp: Date.now(),
      url: currentSession?.url || '',
      viewport: currentSession?.viewport || { width: 1280, height: 720 },
      selectors: [{ selector: 'body', type: 'css', score: 1, isUnique: true }],
      metadata: {},
      assertion
    }

    if (editingStep) {
      const updatedSteps = recordingSteps.map(step => 
        step.id === editingStep.id ? { ...step, assertion } : step
      )
      setRecordingSteps(updatedSteps)
    } else {
      setRecordingSteps([...recordingSteps, newStep])
    }

    setShowAssertionBuilder(false)
    setEditingStep(null)
  }

  const handleEditStep = (step: RecorderStep) => {
    if (step.type === 'assertion') {
      setEditingStep(step)
      setShowAssertionBuilder(true)
    }
  }

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = recordingSteps.filter(step => step.id !== stepId)
    setRecordingSteps(updatedSteps)
  }

  const handleRunSingleStep = async (step: RecorderStep) => {
    if (!window.electronAPI.runner.runSingleStep) {
      console.error('Single step execution not supported')
      return
    }

    setIsRunning(true)
    setTestProgress({ progress: 0, currentStep: `Running step: ${step.type}` })

    try {
      const result = await window.electronAPI.runner.runSingleStep(step, { headless: true })
      setTestProgress({ progress: 100, currentStep: 'Step completed!' })
      
      setRunResult({
        status: result.status,
        outputDir: result.outputDir,
        reportPath: result.reportPath,
        singleStep: true
      })
    } catch (error) {
      console.error('Failed to run single step:', error)
      setRunResult({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        singleStep: true
      })
    } finally {
      setIsRunning(false)
      setTimeout(() => setTestProgress({ progress: 0, currentStep: '' }), 2000)
    }
  }

  const handleSaveCode = async () => {
    try {
      const extension = language === 'python' ? 'py' : (language === 'javascript' ? 'js' : 'ts')
      const filename = `test.${extension}`
      
      const result = await window.electronAPI.file.saveCode(code, filename)
      if (result.success) {
        console.log('Code saved to:', result.filePath)
      } else {
        console.error('Failed to save code:', result.error)
      }
    } catch (error) {
      console.error('Failed to save code:', error)
    }
  }

  const handleExportCode = () => {
    const extension = language === 'python' ? 'py' : (language === 'javascript' ? 'js' : 'ts')
    const filename = `${currentSession?.name || 'test'}.${extension}`
    
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Toolbar */}
      <header className="bg-white shadow-sm border-b px-4 py-2">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">Web Testing IDE</h1>
          
          {/* URL Input */}
          <div className="flex items-center space-x-2">
            <label htmlFor="recording-url" className="text-sm font-medium text-gray-700">
              URL:
            </label>
            <input
              id="recording-url"
              type="url"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isRecording}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ minWidth: '300px' }}
            />
          </div>
          
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
              disabled={!currentSession || isRunning}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !currentSession || isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRunning ? 'Running...' : 'Run'}
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
            
            <div className="border-l border-gray-300 mx-2"></div>
            
            <button
              onClick={undoSteps}
              disabled={!canUndo}
              className={`px-2 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !canUndo 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={redoSteps}
              disabled={!canRedo}
              className={`px-2 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                !canRedo 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Redo (Ctrl+Y)"
            >
              ↷
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex">
        {/* Left Panel - Steps Tree */}
        <div className="w-1/3 bg-white border-r flex flex-col">
          <div className="border-b px-4 py-2 bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="font-medium text-gray-900">Recording Steps</h2>
              <button
                onClick={handleAddAssertion}
                disabled={!currentSession}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  !currentSession 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                + Assert
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {recordingSteps.length === 0 ? (
              <div className="text-gray-500 text-sm">
                {isRecording ? 'Recording in progress...' : 'No recording steps yet. Click "Record" to start capturing interactions.'}
              </div>
            ) : (
              <div className="space-y-2">
                {recordingSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    onEdit={handleEditStep}
                    onDelete={handleDeleteStep}
                    onRunSingle={handleRunSingleStep}
                  />
                ))}
              </div>
            )}

            {showAssertionBuilder && (
              <div className="mt-4">
                <AssertionBuilder
                  onSave={handleSaveAssertion}
                  onCancel={() => {
                    setShowAssertionBuilder(false)
                    setEditingStep(null)
                  }}
                  initialAssertion={editingStep?.assertion}
                />
              </div>
            )}
            
            {runResult && (
              <div className="mt-4 p-3 border rounded">
                <h3 className="font-medium text-sm mb-2">
                  {runResult.singleStep ? 'Single Step Result' : 'Test Run Result'}
                </h3>
                <div className={`text-sm ${runResult.status === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                  Status: {runResult.status}
                </div>
                {runResult.reportPath && (
                  <div className="mt-2">
                    <a 
                      href={`file://${runResult.reportPath}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      View HTML Report
                    </a>
                  </div>
                )}
                {runResult.error && (
                  <div className="mt-2 text-sm text-red-600 break-words">
                    Error: {runResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Tab Bar */}
          <div className="border-b bg-gray-50">
            <div className="flex justify-between items-center">
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
                  Code {isCodeModified && <span className="text-orange-500">*</span>}
                </button>
              </div>
              
              {activeTab === 'code' && (
                <div className="flex items-center space-x-2 px-4">
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value as any)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="playwright">Playwright</option>
                    <option value="cypress">Cypress</option>
                    <option value="selenium">Selenium</option>
                  </select>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>
                  {isCodeModified && (
                    <button
                      onClick={handleRegenerateFromSteps}
                      className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                    >
                      Regenerate from Steps
                    </button>
                  )}
                  <button
                    onClick={handleSaveCode}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleExportCode}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Export
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'steps' ? (
              <div className="h-full p-4 bg-white">
                <div className="text-gray-500 text-sm">
                  Use the Steps panel on the left to manage your recording steps and add assertions.
                  Switch to the Code tab to view and edit the generated test code.
                </div>
              </div>
            ) : (
              <div className="h-full">
                <MonacoEditor
                  value={code}
                  onChange={handleCodeChange}
                  framework={framework}
                  language={language}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <TestProgress
        isRunning={isRunning}
        currentStep={testProgress.currentStep}
        progress={testProgress.progress}
        error={runResult?.status === 'failed' ? runResult.error : undefined}
        onClose={() => setRunResult(null)}
      />
    </div>
  )
}

export default App
