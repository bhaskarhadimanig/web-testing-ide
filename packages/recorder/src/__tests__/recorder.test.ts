import { RecorderEngine } from '../index'
import { promises as fs } from 'fs'
import { join } from 'path'

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined)
  }
}))

const mockFs = fs as jest.Mocked<typeof fs>

describe('RecorderEngine', () => {
  let recorder: RecorderEngine
  const testOutputDir = join(__dirname, '../../test-recordings')

  beforeEach(() => {
    recorder = new RecorderEngine()
  })

  afterEach(async () => {
    jest.clearAllMocks()
  })

  test('should start and stop recording successfully', async () => {
    await recorder.startRecording('https://demo.playwright.dev', {
      mode: 'playwright',
      headless: true,
      outputDir: testOutputDir
    })

    const session = await recorder.stopRecording()
    expect(session).toBeDefined()
    expect(session.id).toBeDefined()
    expect(session.url).toBe('https://demo.playwright.dev')
    expect(session.steps).toBeInstanceOf(Array)
  }, 30000)

  test('should generate valid JSON schema', async () => {
    await recorder.startRecording('https://demo.playwright.dev', {
      mode: 'playwright',
      headless: true,
      outputDir: testOutputDir
    })

    const session = await recorder.stopRecording()
    
    const exportRecorder = new RecorderEngine()
    exportRecorder['recording'] = session
    const exported = await exportRecorder.exportRecording('json')
    const parsed = JSON.parse(exported)

    expect(parsed).toHaveProperty('id')
    expect(parsed).toHaveProperty('steps')
    expect(parsed.steps).toBeInstanceOf(Array)
    expect(parsed).toHaveProperty('viewport')
    expect(parsed).toHaveProperty('userAgent')
    expect(parsed).toHaveProperty('createdAt')
    expect(parsed).toHaveProperty('updatedAt')
    expect(parsed).toHaveProperty('metadata')
  }, 30000)

  test('should throw error when starting recording twice', async () => {
    await recorder.startRecording('https://demo.playwright.dev', {
      mode: 'playwright',
      headless: true,
      outputDir: testOutputDir
    })

    await expect(recorder.startRecording('https://demo.playwright.dev', {
      mode: 'playwright',
      headless: true,
      outputDir: testOutputDir
    })).rejects.toThrow('Recording already in progress')

    await recorder.stopRecording()
  }, 30000)

  test('should throw error when stopping without recording', async () => {
    await expect(recorder.stopRecording()).rejects.toThrow('No recording in progress')
  })

  test('should throw error when exporting without recording', async () => {
    await expect(recorder.exportRecording('json')).rejects.toThrow('No recording to export')
  })
})
