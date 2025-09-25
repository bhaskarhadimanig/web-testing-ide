import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { RecordingSession, RecorderStep, SelectorCandidate } from '@web-testing-ide/common'
import { promises as fs } from 'fs'
import { join } from 'path'

export interface RecorderOptions {
  mode: 'playwright' | 'extension'
  headless?: boolean
  viewport?: { width: number; height: number }
  outputDir?: string
}

export class RecorderEngine {
  private browser: Browser | null = null
  private page: Page | null = null
  private context: BrowserContext | null = null
  private recording: RecordingSession | null = null
  private steps: RecorderStep[] = []
  private isRecording = false
  private stepCounter = 0

  async startRecording(url: string, options: RecorderOptions = { mode: 'playwright' }): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress')
    }

    this.browser = await chromium.launch({ 
      headless: options.headless ?? false 
    })
    
    this.context = await this.browser.newContext({
      viewport: options.viewport ?? { width: 1280, height: 720 }
    })
    
    this.page = await this.context.newPage()
    
    const sessionId = `session-${Date.now()}`
    this.recording = {
      id: sessionId,
      name: `Recording ${new Date().toISOString()}`,
      url,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [],
      viewport: options.viewport ?? { width: 1280, height: 720 },
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      metadata: {
        description: 'Recorded session',
        tags: ['recorded'],
        duration: 0,
        totalSteps: 0
      }
    }

    const outputDir = options.outputDir ?? join(process.cwd(), 'recordings', sessionId)
    await fs.mkdir(outputDir, { recursive: true })
    await fs.mkdir(join(outputDir, 'screenshots'), { recursive: true })

    this.setupEventListeners()
    
    this.isRecording = true
    
    await this.page.goto(url)
    await this.captureStep('navigate', url, [])
  }

  async stopRecording(): Promise<RecordingSession> {
    if (!this.isRecording || !this.recording) {
      throw new Error('No recording in progress')
    }

    this.isRecording = false
    
    this.recording.steps = this.steps
    this.recording.updatedAt = Date.now()
    this.recording.metadata.duration = this.recording.updatedAt - this.recording.createdAt
    this.recording.metadata.totalSteps = this.steps.length

    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
      this.context = null
    }

    const session = this.recording
    this.recording = null
    this.steps = []
    this.stepCounter = 0

    return session
  }

  async exportRecording(format: 'json' = 'json'): Promise<string> {
    if (!this.recording) {
      throw new Error('No recording to export')
    }

    if (format === 'json') {
      return JSON.stringify(this.recording, null, 2)
    }

    throw new Error(`Unsupported export format: ${format}`)
  }

  private setupEventListeners(): void {
    if (!this.page) return

    this.page.on('framenavigated', async (frame) => {
      if (frame === this.page!.mainFrame()) {
        await this.captureStep('navigate', frame.url(), [])
      }
    })
  }

  private async captureStep(type: RecorderStep['type'], url: string, selectors: SelectorCandidate[], value?: any): Promise<void> {
    if (!this.isRecording || !this.page || !this.recording) return

    const stepId = `step-${String(++this.stepCounter).padStart(3, '0')}`
    const screenshotPath = `screenshots/${stepId}.png`
    
    await this.page.screenshot({ 
      path: join(process.cwd(), 'recordings', this.recording.id, screenshotPath),
      fullPage: false 
    })

    const step: RecorderStep = {
      id: stepId,
      type,
      timestamp: Date.now(),
      url,
      viewport: this.recording.viewport,
      selectors,
      value,
      screenshot: screenshotPath,
      metadata: {
        tagName: 'html'
      }
    }

    this.steps.push(step)
  }

  private async generateSelectors(): Promise<SelectorCandidate[]> {
    return [
      {
        selector: 'button',
        type: 'css',
        score: 0.5,
        isUnique: false
      }
    ]
  }
}
