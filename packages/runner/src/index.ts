import { RecordingSession, TestRun, TestArtifact, TestError } from '@web-testing-ide/common'
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
      const outputDir = join(process.cwd(), opts.outputDir!, runId)
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

      return testRun

    } catch (error) {
      return {
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
        '--reporter=json',
        options.headless ? '--headed' : '--headed'
      ]

      const child = spawn('npx', ['playwright', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
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
          const files = await fs.readdir(outputDir)
          for (const file of files) {
            const filePath = join(outputDir, file)
            const stat = await fs.stat(filePath)
            
            if (stat.isFile()) {
              let type: TestArtifact['type'] = 'log'
              
              if (file.endsWith('.png')) type = 'screenshot'
              else if (file.endsWith('.zip')) type = 'trace'
              else if (file.endsWith('.webm')) type = 'video'

              artifacts.push({
                type,
                path: filePath
              })
            }
          }
        } catch (error) {
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
}
