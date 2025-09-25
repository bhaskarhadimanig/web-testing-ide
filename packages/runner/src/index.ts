import { RecordingSession, TestRun, TestArtifact, TestError, RecorderStep } from '@web-testing-ide/common'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'

export interface RunnerOptions {
  headless?: boolean
  timeout?: number
  retries?: number
  outputDir?: string
}

export class TestRunner {
  private defaultOptions: RunnerOptions = {
    headless: true,
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

      const result = await this.executePlaywrightTest(testFilePath, outputDir, opts)

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

  private async executePlaywrightTest(
    testFilePath: string, 
    outputDir: string, 
    options: RunnerOptions
  ): Promise<{ success: boolean; artifacts: TestArtifact[]; errors: TestError[] }> {
    return new Promise((resolve) => {
      const args = [
        'test',
        testFilePath,
        '--reporter=json'
      ]
      
      if (!options.headless) {
        args.push('--headed')
      }

      const child = spawn('npx', ['playwright', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '0',
          PLAYWRIGHT_TEST_OUTPUT_DIR: outputDir
        }
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', async (code) => {
        const artifacts: TestArtifact[] = []
        const errors: TestError[] = []

        try {
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
      
      const result = await this.executePlaywrightTest(tempTestPath, outputDir, opts)
      
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
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .status { padding: 8px 16px; border-radius: 4px; font-weight: bold; display: inline-block; }
        .status.passed { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .artifacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .artifact { border: 1px solid #ddd; border-radius: 4px; padding: 15px; }
        .artifact img { max-width: 100%; height: auto; border-radius: 4px; }
        .errors { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
        .error { margin-bottom: 10px; font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Report</h1>
            <p><strong>Run ID:</strong> ${testRun.id}</p>
            <p><strong>Status:</strong> <span class="status ${testRun.status}">${testRun.status.toUpperCase()}</span></p>
            <p><strong>Duration:</strong> ${testRun.completedAt! - testRun.startedAt}ms</p>
            <p><strong>Started:</strong> ${new Date(testRun.startedAt).toLocaleString()}</p>
        </div>

        ${testRun.errors && testRun.errors.length > 0 ? `
        <div class="errors">
            <h3>Errors (${testRun.errors.length})</h3>
            ${testRun.errors.map((error: any) => `
                <div class="error">
                    <strong>Step:</strong> ${error.stepId}<br>
                    <strong>Message:</strong> ${error.message}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <h3>Artifacts (${testRun.artifacts.length})</h3>
        <div class="artifacts">
            ${testRun.artifacts.map((artifact: any) => `
                <div class="artifact">
                    <h4>${artifact.type.toUpperCase()}</h4>
                    ${artifact.type === 'screenshot' ? `
                        <img src="file://${artifact.path}" alt="Screenshot" />
                    ` : `
                        <p><a href="file://${artifact.path}" target="_blank">View ${artifact.type}</a></p>
                    `}
                    <p><small>${artifact.path}</small></p>
                </div>
            `).join('')}
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
