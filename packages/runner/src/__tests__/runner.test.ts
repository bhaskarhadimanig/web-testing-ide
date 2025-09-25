import { TestRunner } from '../index'

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue(['test.png', 'trace.zip']),
    stat: jest.fn().mockResolvedValue({ isFile: () => true })
  }
}))

jest.mock('child_process', () => ({
  spawn: jest.fn()
}))

import { promises as fs } from 'fs'
import { spawn } from 'child_process'

const mockFs = fs as any
const mockSpawn = spawn as any

describe('TestRunner', () => {
  let runner: TestRunner

  beforeEach(() => {
    runner = new TestRunner()
    jest.clearAllMocks()
  })

  describe('runTest', () => {
    test('should run test successfully', async () => {
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

      const result = await runner.runTest('test.spec.ts')

      expect(result.status).toBe('passed')
      expect(result.id).toMatch(/^run-\d+$/)
      expect(mockFs.mkdir).toHaveBeenCalled()
    })

    test('should handle test failure', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn((event: string, callback: any) => {
          if (event === 'data') {
            callback('Test failed')
          }
        }) },
        on: jest.fn((event: string, callback: any) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChild as any)

      const result = await runner.runTest('test.spec.ts')

      expect(result.status).toBe('failed')
      expect(result.errors).toHaveLength(1)
      expect(result.errors![0].message).toBe('Test failed')
    })

    test('should collect artifacts', async () => {
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

      const result = await runner.runTest('test.spec.ts')

      expect(result.artifacts).toHaveLength(2)
      expect(result.artifacts[0].type).toBe('screenshot')
      expect(result.artifacts[1].type).toBe('trace')
    })
  })

  describe('runAllTests', () => {
    test('should find and run multiple tests', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'test1.test.ts', isDirectory: () => false },
        { name: 'test2.spec.ts', isDirectory: () => false },
        { name: 'other.js', isDirectory: () => false }
      ] as any)

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10)
          }
        })
      }

      mockSpawn.mockReturnValue(mockChild as any)

      const results = await runner.runAllTests('test-dir')

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('passed')
      expect(results[1].status).toBe('passed')
    })
  })
})
