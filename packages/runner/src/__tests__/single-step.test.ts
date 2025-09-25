import { TestRunner } from '../index'
import { RecorderStep } from '@web-testing-ide/common'

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}))

jest.mock('child_process', () => ({
  spawn: jest.fn()
}))

import { spawn } from 'child_process'
const mockSpawn = spawn as any

describe('TestRunner - Single Step', () => {
  let runner: TestRunner

  beforeEach(() => {
    runner = new TestRunner()
    jest.clearAllMocks()
  })

  test('should run single step successfully', async () => {
    const mockStep: RecorderStep = {
      id: 'test-step',
      type: 'click',
      timestamp: Date.now(),
      url: 'https://example.com',
      viewport: { width: 1280, height: 720 },
      selectors: [{ selector: '.button', type: 'css', score: 1, isUnique: true }],
      metadata: {}
    }

    const mockChild = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn((event: string, callback: any) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })
    }

    mockSpawn.mockReturnValue(mockChild as any)

    const result = await runner.runSingleStep(mockStep, { outputDir: 'test-output' })

    expect(result.status).toBe('passed')
    expect(result.sessionId).toBe(mockStep.id)
  })
})
