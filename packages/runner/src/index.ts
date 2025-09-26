import { RecordingSession, TestRun, TestArtifact, TestError, RecorderStep } from '@web-testing-ide/common'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import * as path from 'path'

export interface RunnerOptions {
  headless?: boolean
  timeout?: number
  retries?: number
  outputDir?: string
}

export class TestRunner {
  private defaultOptions: RunnerOptions = {
    headless: false, // Ensure browser is visible during test execution
    timeout: 30000,
    retries: 3,
    outputDir: 'test-results'
  }

  async runTest(testFilePath: string, options: RunnerOptions = {}): Promise<TestRun> {
    const opts = { ...this.defaultOptions, ...options }
    const runId = `run-${Date.now()}`
    const startedAt = Date.now()

    try {
      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })

      const result = await this.executeTest(testFilePath, outputDir, opts, 'playwright')

      const testRun: TestRun = {
        id: runId,
        sessionId: 'unknown',
        status: result.success ? 'passed' : 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: result.artifacts,
        errors: result.errors
      }

      if (!result.success && result.errors.length > 0) {
        await this.generateFailureJson(testRun, outputDir)
      }

      await this.generateHtmlReport(testRun, outputDir)

      return testRun

    } catch (error) {
      const testRun: TestRun = {
        id: runId,
        sessionId: 'unknown',
        status: 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: [],
        errors: [{
          stepId: 'setup',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }]
      }

      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })
      await this.generateFailureJson(testRun, outputDir)
      await this.generateHtmlReport(testRun, outputDir)

      return testRun
    }
  }

  async runGeneratedTest(testCode: string, options: RunnerOptions = {}): Promise<TestRun> {
    const opts = { ...this.defaultOptions, ...options }
    const runId = `run-${Date.now()}`
    const startedAt = Date.now()

    try {
      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })

      const framework = this.detectFramework(testCode)
      const extension = framework === 'selenium' && testCode.includes('import org.openqa.selenium') ? '.java' : 
                       framework === 'selenium' && testCode.includes('from selenium') ? '.py' :
                       framework === 'cypress' ? '.cy.js' : '.spec.ts'
      const tempTestPath = join(outputDir, `generated-test${extension}`)
      await fs.writeFile(tempTestPath, testCode, 'utf-8')

      const result = await this.executeTest(tempTestPath, outputDir, opts, framework)

      const testRun: TestRun = {
        id: runId,
        sessionId: 'generated',
        status: result.success ? 'passed' : 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: result.artifacts,
        errors: result.errors
      }

      if (!result.success && result.errors.length > 0) {
        await this.generateFailureJson(testRun, outputDir)
      }

      await this.generateHtmlReport(testRun, outputDir)

      return testRun

    } catch (error) {
      const testRun: TestRun = {
        id: runId,
        sessionId: 'generated',
        status: 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: [],
        errors: [{
          stepId: 'setup',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }]
      }

      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })
      await this.generateFailureJson(testRun, outputDir)
      await this.generateHtmlReport(testRun, outputDir)

      return testRun
    }
  }

  async runAllTests(testDir: string = 'examples/generated', options: RunnerOptions = {}): Promise<TestRun[]> {
    try {
      const testFiles = await this.findTestFiles(testDir)
      const results: TestRun[] = []

      for (const testFile of testFiles) {
        const result = await this.runTest(testFile, options)
        results.push(result)
      }

      return results

    } catch (error) {
      throw new Error(`Failed to run tests: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async executeTest(
    testFilePath: string, 
    outputDir: string, 
    options: RunnerOptions,
    framework: 'playwright' | 'selenium' | 'cypress' = 'playwright'
  ): Promise<{ success: boolean; artifacts: TestArtifact[]; errors: TestError[] }> {
    return new Promise((resolve) => {
      let command: string
      let args: string[]
      
      if (framework === 'selenium') {
        if (testFilePath.endsWith('.java')) {
          const className = path.basename(testFilePath, '.java')
          const classDir = path.dirname(testFilePath)
          
          command = 'javac'
          args = ['-cp', '.:/usr/share/java/selenium-server-standalone.jar:/usr/share/java/junit-platform-console-standalone.jar', testFilePath]
          console.log(`Compiling Selenium Java test: ${command} ${args.join(' ')}`) // (important-comment)
          
          
        } else {
          command = 'python3'
          args = [testFilePath]
          console.log(`Executing Selenium Python test: ${command} ${args.join(' ')}`) // (important-comment)
        }
      } else if (framework === 'cypress') {
        command = 'npx'
        args = ['cypress', 'run', '--spec', testFilePath]
        if (!options.headless) {
          args.push('--headed')
          console.log(`Browser will run in headed mode for visible execution`) // (important-comment)
        }
        console.log(`Executing Cypress test: ${command} ${args.join(' ')}`) // (important-comment)
      } else {
        command = 'npx'
        args = [
          'playwright',
          'test',
          testFilePath,
          '--reporter=json'
        ]
        
        if (!options.headless) {
          args.push('--headed')
          args.push('--browser=chromium')
          console.log(`Browser will run in headed mode for visible execution`) // (important-comment)
        } else {
          console.log(`Browser will run in headless mode`) // (important-comment)
        }
        
        args.push('--screenshot=on')
        args.push('--trace=on')
        console.log(`Executing Playwright test: ${command} ${args.join(' ')}`) // (important-comment)
      }

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
          PLAYWRIGHT_TEST_OUTPUT_DIR: outputDir,
          DISPLAY: process.env.DISPLAY || ':0'
        }
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        const output = data.toString()
        stdout += output
        console.log(`Playwright stdout: ${output.trim()}`) // (important-comment)
      })

      child.stderr?.on('data', (data) => {
        const output = data.toString()
        stderr += output
        console.log(`Playwright stderr: ${output.trim()}`) // (important-comment)
      })

      child.on('close', async (code) => {
        console.log(`Test process exited with code: ${code}`) // (important-comment)
        
        if (framework === 'selenium' && testFilePath.endsWith('.java') && code === 0 && command === 'javac') {
          console.log(`Java compilation successful, now executing the test...`) // (important-comment)
          
          const className = path.basename(testFilePath, '.java')
          const classDir = path.dirname(testFilePath)
          
          const javaChild = spawn('java', [
            '-cp', `.:/usr/share/java/selenium-server-standalone.jar:/usr/share/java/junit-platform-console-standalone.jar:${classDir}`,
            'org.junit.platform.console.ConsoleLauncher',
            '--class-path', classDir,
            '--select-class', className
          ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd(),
            env: {
              ...process.env,
              DISPLAY: process.env.DISPLAY || ':0'
            }
          })
          
          let javaStdout = ''
          let javaStderr = ''
          
          javaChild.stdout?.on('data', (data) => {
            const output = data.toString()
            javaStdout += output
            console.log(`Java execution stdout: ${output.trim()}`) // (important-comment)
          })
          
          javaChild.stderr?.on('data', (data) => {
            const output = data.toString()
            javaStderr += output
            console.log(`Java execution stderr: ${output.trim()}`) // (important-comment)
          })
          
          javaChild.on('close', async (javaCode) => {
            console.log(`Java execution exited with code: ${javaCode}`) // (important-comment)
            
            const artifacts: TestArtifact[] = []
            const errors: TestError[] = []
            
            // Collect artifacts after Java execution
            try {
              console.log(`Collecting artifacts from output directory: ${outputDir}`) // (important-comment)
              const files = await fs.readdir(outputDir, { withFileTypes: true })
              
              for (const file of files) {
                if (file.isFile() && !file.name.endsWith('.json')) {
                  const filePath = join(outputDir, file.name)
                  let type: TestArtifact['type'] = 'log'
                  
                  if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                    type = 'screenshot'
                  } else if (file.name.endsWith('.zip') || file.name.endsWith('.trace')) {
                    type = 'trace'
                  } else if (file.name.endsWith('.webm') || file.name.endsWith('.mp4')) {
                    type = 'video'
                  } else if (file.name.endsWith('.log') || file.name.endsWith('.txt')) {
                    type = 'log'
                  }

                  artifacts.push({
                    type,
                    path: filePath
                  })
                }
              }
            } catch (artifactError) {
              console.log(`Error collecting artifacts: ${artifactError}`) // (important-comment)
            }
            
            if (javaCode === 0) {
              resolve({
                success: true,
                artifacts,
                errors: []
              })
            } else {
              errors.push({
                stepId: 'java-execution',
                message: `Java test execution failed with exit code ${javaCode}`,
                stack: javaStderr || javaStdout
              })
              
              resolve({
                success: false,
                artifacts,
                errors
              })
            }
          })
          
          return // Don't continue with the original artifact collection
        }
        const artifacts: TestArtifact[] = []
        const errors: TestError[] = []

        try {
          console.log(`Collecting artifacts from output directory: ${outputDir}`) // (important-comment)
          const files = await fs.readdir(outputDir, { withFileTypes: true })
          console.log(`Found ${files.length} files in output directory`) // (important-comment)
          
          for (const file of files) {
            if (file.isFile() && !file.name.endsWith('.json')) {
              const filePath = join(outputDir, file.name)
              let type: TestArtifact['type'] = 'log'
              
              if (file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
                type = 'screenshot'
              } else if (file.name.endsWith('.zip') || file.name.endsWith('.trace')) {
                type = 'trace'
              } else if (file.name.endsWith('.webm') || file.name.endsWith('.mp4')) {
                type = 'video'
              } else if (file.name.endsWith('.log') || file.name.endsWith('.txt')) {
                type = 'log'
              }

              artifacts.push({
                type,
                path: filePath
              })
              console.log(`Added artifact: ${type} - ${filePath}`) // (important-comment)
            }
          }

          try {
            console.log(`Collecting recording screenshots from recordings directory`) // (important-comment)
            const recordingsDir = join(process.cwd(), 'recordings')
            const recordingDirs = await fs.readdir(recordingsDir, { withFileTypes: true })
            console.log(`Found ${recordingDirs.length} recording directories`) // (important-comment)
            
            for (const recordingDir of recordingDirs) {
              if (recordingDir.isDirectory()) {
                const screenshotsDir = join(recordingsDir, recordingDir.name, 'screenshots')
                try {
                  const screenshotFiles = await fs.readdir(screenshotsDir, { withFileTypes: true })
                  console.log(`Found ${screenshotFiles.length} screenshot files in ${screenshotsDir}`) // (important-comment)
                  
                  for (const screenshotFile of screenshotFiles) {
                    if (screenshotFile.isFile() && (screenshotFile.name.endsWith('.png') || screenshotFile.name.endsWith('.jpg'))) {
                      const screenshotPath = join(screenshotsDir, screenshotFile.name)
                      artifacts.push({
                        type: 'screenshot',
                        path: screenshotPath
                      })
                      console.log(`Added recording screenshot: ${screenshotPath}`) // (important-comment)
                    }
                  }
                } catch (screenshotError) {
                  console.log(`No screenshots found in ${screenshotsDir}`) // (important-comment)
                }
              }
            }
            
            try {
              const ideRecordingsDir = join(process.cwd(), 'apps', 'ide-electron', 'recordings')
              const ideRecordingDirs = await fs.readdir(ideRecordingsDir, { withFileTypes: true })
              console.log(`Found ${ideRecordingDirs.length} IDE recording directories`) // (important-comment)
              
              for (const recordingDir of ideRecordingDirs) {
                if (recordingDir.isDirectory()) {
                  const screenshotsDir = join(ideRecordingsDir, recordingDir.name, 'screenshots')
                  try {
                    const screenshotFiles = await fs.readdir(screenshotsDir, { withFileTypes: true })
                    console.log(`Found ${screenshotFiles.length} IDE screenshot files in ${screenshotsDir}`) // (important-comment)
                    
                    for (const screenshotFile of screenshotFiles) {
                      if (screenshotFile.isFile() && (screenshotFile.name.endsWith('.png') || screenshotFile.name.endsWith('.jpg'))) {
                        const screenshotPath = join(screenshotsDir, screenshotFile.name)
                        artifacts.push({
                          type: 'screenshot',
                          path: screenshotPath
                        })
                        console.log(`Added IDE recording screenshot: ${screenshotPath}`) // (important-comment)
                      }
                    }
                  } catch (screenshotError) {
                    console.log(`No screenshots found in IDE ${screenshotsDir}`) // (important-comment)
                  }
                }
              }
            } catch (ideRecordingError) {
              console.log(`No IDE recordings directory found`) // (important-comment)
            }
          } catch (recordingError) {
            console.log(`No recordings directory found`) // (important-comment)
          }
        } catch (error) {
          console.error('Failed to collect artifacts:', error)
        }

        if (stderr) {
          errors.push({
            stepId: 'execution',
            message: stderr,
            stack: stderr
          })
        }

        console.log(`Test execution completed. Success: ${code === 0}, Artifacts: ${artifacts.length}, Errors: ${errors.length}`) // (important-comment)
        
        resolve({
          success: code === 0,
          artifacts,
          errors
        })
      })

      child.on('error', (error) => {
        resolve({
          success: false,
          artifacts: [],
          errors: [{
            stepId: 'spawn',
            message: error.message,
            stack: error.stack
          }]
        })
      })
    })
  }

  private detectFramework(testCode: string): 'playwright' | 'selenium' | 'cypress' {
    if (testCode.includes('@playwright/test') || testCode.includes('import { test, expect } from \'@playwright/test\'')) {
      return 'playwright'
    } else if (testCode.includes('org.openqa.selenium') || testCode.includes('from selenium import') || testCode.includes('WebDriver') || testCode.includes('ChromeDriver')) {
      return 'selenium'
    } else if (testCode.includes('cypress') || testCode.includes('cy.')) {
      return 'cypress'
    }
    return 'playwright' // Default fallback
  }

  private async findTestFiles(dir: string): Promise<string[]> {
    const testFiles: string[] = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        
        if (entry.isDirectory()) {
          const subFiles = await this.findTestFiles(fullPath)
          testFiles.push(...subFiles)
        } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts')) {
          testFiles.push(fullPath)
        }
      }
    } catch (error) {
    }

    return testFiles
  }

  async runSingleStep(step: RecorderStep, options: RunnerOptions = {}): Promise<TestRun> {
    const opts = { ...this.defaultOptions, ...options }
    const runId = `step-${Date.now()}`
    const startedAt = Date.now()

    try {
      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })

      const tempTestCode = this.generateSingleStepTest(step)
      const tempTestPath = join(outputDir, 'single-step.test.ts')
      
      await fs.writeFile(tempTestPath, tempTestCode, 'utf-8')
      
      const result = await this.executeTest(tempTestPath, outputDir, opts, 'playwright')
      
      const testRun: TestRun = {
        id: runId,
        sessionId: step.id,
        status: result.success ? 'passed' : 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: result.artifacts,
        errors: result.errors
      }

      if (!result.success && result.errors.length > 0) {
        await this.generateFailureJson(testRun, outputDir)
      }

      await this.generateHtmlReport(testRun, outputDir)

      return testRun

    } catch (error) {
      const testRun: TestRun = {
        id: runId,
        sessionId: step.id,
        status: 'failed',
        startedAt,
        completedAt: Date.now(),
        artifacts: [],
        errors: [{
          stepId: step.id,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }]
      }

      const outputDir = opts.outputDir || join(process.cwd(), 'runs', runId)
      await fs.mkdir(outputDir, { recursive: true })
      await this.generateFailureJson(testRun, outputDir)
      await this.generateHtmlReport(testRun, outputDir)

      return testRun
    }
  }

  private generateSingleStepTest(step: RecorderStep): string {
    const selector = step.selectors[0]?.selector || 'body'
    
    let stepCode = ''
    switch (step.type) {
      case 'navigate':
        stepCode = `await page.goto('${step.url}')`
        break
      case 'click':
        stepCode = `await page.click('${selector}')`
        break
      case 'type':
        stepCode = `await page.fill('${selector}', '${step.value || ''}')`
        break
      case 'checkbox':
        stepCode = step.value ? `await page.check('${selector}')` : `await page.uncheck('${selector}')`
        break
      case 'radio':
        stepCode = `await page.check('${selector}')`
        break
      default:
        if (step.type === 'assertion' && (step as any).assertion) {
          const assertion = (step as any).assertion
          switch (assertion.type) {
            case 'exists':
            case 'visible':
              stepCode = `await expect(page.locator('${selector}')).toBeVisible()`
              break
            case 'containsText':
              stepCode = `await expect(page.locator('${selector}')).toContainText('${assertion.expectedValue}')`
              break
            case 'urlContains':
              stepCode = `await expect(page).toHaveURL(/${assertion.expectedValue}/)`
              break
          }
        }
        break
      case 'screenshot':
        stepCode = `await page.screenshot({ path: '${step.screenshot || 'screenshot.png'}' })`
        break
      case 'wait':
        stepCode = `await page.waitForTimeout(${step.value || 1000})`
        break
    }

    return `import { test, expect } from '@playwright/test'

test('Single step execution', async ({ page }) => {
  ${stepCode}
})`
  }

  private async generateFailureJson(testRun: TestRun, outputDir: string): Promise<void> {
    try {
      const failurePath = join(outputDir, 'failure.json')
      const failureData = {
        runId: testRun.id,
        status: testRun.status,
        startedAt: testRun.startedAt,
        completedAt: testRun.completedAt,
        errors: testRun.errors,
        artifacts: testRun.artifacts
      }
      await fs.writeFile(failurePath, JSON.stringify(failureData, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to generate failure.json:', error)
    }
  }

  private async collectArtifacts(outputDir: string, artifacts: Array<{ type: string; path: string }>): Promise<void> {
    try {
      const files = await fs.readdir(outputDir, { recursive: true })
      
      for (const file of files) {
        const filePath = join(outputDir, file as string)
        const stat = await fs.stat(filePath)
        
        if (stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          let type = 'unknown'
          
          if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            type = 'screenshot'
          } else if (ext === '.json') {
            type = 'report'
          } else if (ext === '.zip') {
            type = 'trace'
          } else if (ext === '.webm' || ext === '.mp4') {
            type = 'video'
          }
          
          artifacts.push({ type, path: filePath })
        }
      }

      const recordingsDir = join(process.cwd(), 'apps', 'ide-electron', 'recordings')
      try {
        const recordingFiles = await fs.readdir(recordingsDir, { recursive: true })
        for (const file of recordingFiles) {
          const filePath = join(recordingsDir, file as string)
          const stat = await fs.stat(filePath)
          
          if (stat.isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            if (['.png', '.jpg'].includes(ext)) {
              artifacts.push({ type: 'screenshot', path: filePath })
            }
          }
        }
      } catch (error) {
        console.log('No recordings directory found, skipping screenshot collection')
      }

      const testResultsDir = join(outputDir, 'test-results')
      try {
        const testResultFiles = await fs.readdir(testResultsDir, { recursive: true })
        for (const file of testResultFiles) {
          const filePath = join(testResultsDir, file as string)
          const stat = await fs.stat(filePath)
          
          if (stat.isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            if (['.png', '.jpg', '.jpeg'].includes(ext)) {
              artifacts.push({ type: 'screenshot', path: filePath })
            } else if (ext === '.zip') {
              artifacts.push({ type: 'trace', path: filePath })
            }
          }
        }
      } catch (error) {
        console.log('No test-results directory found, skipping additional artifact collection')
      }
      
    } catch (error) {
      console.error('Failed to collect artifacts:', error)
    }
  }

  private async generateHtmlReport(testRun: TestRun, outputDir: string): Promise<void> {
    try {
      const reportPath = join(outputDir, 'report.html')
      
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${testRun.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { 
            font-size: 2.5em; 
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .status { 
            display: inline-block;
            padding: 12px 24px; 
            border-radius: 25px; 
            font-weight: bold;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 15px;
        }
        .status.passed { background: rgba(40, 167, 69, 0.9); color: white; }
        .status.failed { background: rgba(220, 53, 69, 0.9); color: white; }
        .status.running { background: rgba(23, 162, 184, 0.9); color: white; }
        .content { padding: 40px; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 30px; 
            margin-bottom: 40px; 
        }
        .stat { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px; 
            border-radius: 15px; 
            text-align: center;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .stat:hover { transform: translateY(-5px); }
        .stat-value { 
            font-size: 3em; 
            font-weight: bold; 
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .stat-label { 
            font-size: 1.1em;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section { 
            background: white;
            margin: 30px 0;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        .section h2 { 
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 3px solid #4facfe;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4facfe;
        }
        .info-label { font-weight: bold; color: #495057; margin-bottom: 5px; }
        .info-value { color: #6c757d; }
        .artifacts { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 30px; 
            margin-top: 30px; 
        }
        .artifact { 
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .artifact:hover { transform: scale(1.02); }
        .artifact img { 
            width: 100%; 
            height: auto;
            display: block;
        }
        .artifact-title { 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: bold;
            font-size: 1.1em;
        }
        .errors { margin-top: 30px; }
        .error { 
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            border-radius: 15px;
            padding: 25px; 
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .error h3 { 
            color: #721c24; 
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .error p { 
            color: #721c24; 
            margin-bottom: 10px;
            font-weight: 500;
        }
        .error pre { 
            background: rgba(255,255,255,0.7);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.9em;
            color: #495057;
        }
        .no-data {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Test Execution Report</h1>
            <p><strong>Run ID:</strong> ${testRun.id}</p>
            <div class="status ${testRun.status}">${testRun.status}</div>
            <p><strong>Completed:</strong> ${new Date(testRun.startedAt).toLocaleString()}</p>
        </div>

        <div class="content">
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${testRun.completedAt! - testRun.startedAt}ms</div>
                    <div class="stat-label">Duration</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${testRun.artifacts.length}</div>
                    <div class="stat-label">Artifacts</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${testRun.errors?.length || 0}</div>
                    <div class="stat-label">Errors</div>
                </div>
            </div>

            ${testRun.errors && testRun.errors.length > 0 ? `
            <div class="section">
                <h3>❌ Errors (${testRun.errors.length})</h3>
                <div class="errors">
                    ${testRun.errors.map((error: any) => `
                        <div class="error">
                            <strong>Step:</strong> ${error.stepId}<br>
                            <strong>Message:</strong> ${error.message}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h3>📸 Test Artifacts (${testRun.artifacts.length})</h3>
                <div class="artifacts">
                    ${testRun.artifacts.map((artifact: any) => `
                        <div class="artifact">
                            <div class="artifact-title">${artifact.type.toUpperCase()}</div>
                            ${artifact.type === 'screenshot' ? `
                                <img src="file://${artifact.path}" alt="Test Screenshot" />
                            ` : `
                                <div style="padding: 20px;">
                                    <a href="file://${artifact.path}" target="_blank">📄 View ${artifact.type}</a>
                                </div>
                            `}
                            <div style="padding: 10px; font-size: 0.9em; color: #666;">
                                📁 ${artifact.path}
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${testRun.artifacts.length === 0 ? '<div class="no-data">No artifacts generated</div>' : ''}
            </div>
        </div>
    </div>
</body>
</html>
      `

      await fs.writeFile(reportPath, html, 'utf-8')
    } catch (error) {
      console.error('Failed to generate HTML report:', error)
    }
  }
}
