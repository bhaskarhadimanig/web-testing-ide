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
}
