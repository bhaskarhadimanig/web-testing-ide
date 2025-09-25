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

    await this.setupEventListeners()
    
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

  private async setupEventListeners(): Promise<void> {
    if (!this.page) return

    this.page.on('framenavigated', async (frame) => {
      if (frame === this.page!.mainFrame()) {
        await this.captureStep('navigate', frame.url(), [])
      }
    })

    await this.setupDOMEventListeners()
    this.startEventPolling()
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

  private async setupDOMEventListeners(): Promise<void> {
    if (!this.page) return

    await this.page.evaluate(() => {
      const captureEvent = (type: string, element: Element, value?: any) => {
        (window as any).__recordingEvents = (window as any).__recordingEvents || []
        ;(window as any).__recordingEvents.push({ type, element, value, timestamp: Date.now() })
      }

      document.addEventListener('click', (e) => {
        captureEvent('click', e.target as Element)
      }, true)

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          captureEvent('type', target, target.value)
        }
      }, true)

      document.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement
        let value: any = target.value
        if (target.type === 'checkbox' || target.type === 'radio') {
          value = (target as HTMLInputElement).checked
        }
        captureEvent('select', target, value)
      }, true)

      document.addEventListener('dblclick', (e) => {
        captureEvent('doubleClick', e.target as Element)
      }, true)
    })
  }

  private startEventPolling(): void {
    const pollEvents = async () => {
      if (!this.isRecording || !this.page) return

      try {
        const events = await this.page.evaluate(() => {
          const events = (window as any).__recordingEvents || []
          ;(window as any).__recordingEvents = []
          return events
        })

        for (const event of events) {
          const selectors = await this.generateSelectorsFromEvent(event)
          await this.captureStep(event.type, this.page!.url(), selectors, event.value)
        }
      } catch (error) {
        console.error('Error polling events:', error)
      }

      if (this.isRecording) {
        setTimeout(pollEvents, 100)
      }
    }

    setTimeout(pollEvents, 100)
  }

  private async generateSelectorsFromEvent(event: any): Promise<SelectorCandidate[]> {
    if (!this.page) return []
    
    return await this.page.evaluate((eventData) => {
      const el = eventData.element
      if (!el) return []
      
      const selectors: SelectorCandidate[] = []
      
      if (el.id) {
        selectors.push({
          selector: `#${el.id}`,
          type: 'id',
          score: 100,
          isUnique: document.querySelectorAll(`#${el.id}`).length === 1
        })
      }
      
      if (el.getAttribute && el.getAttribute('data-testid')) {
        selectors.push({
          selector: `[data-testid="${el.getAttribute('data-testid')}"]`,
          type: 'data-testid',
          score: 90,
          isUnique: document.querySelectorAll(`[data-testid="${el.getAttribute('data-testid')}"]`).length === 1
        })
      }
      
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter((c: string) => c.trim())
        if (classes.length > 0) {
          const classSelector = '.' + classes.join('.')
          selectors.push({
            selector: classSelector,
            type: 'css',
            score: 70,
            isUnique: document.querySelectorAll(classSelector).length === 1
          })
        }
      }
      
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        const text = el.textContent?.trim()
        if (text) {
          selectors.push({
            selector: `${el.tagName.toLowerCase()}:has-text("${text}")`,
            type: 'text',
            score: 80,
            isUnique: Array.from(document.querySelectorAll(el.tagName.toLowerCase())).filter((e: any) => e.textContent?.trim() === text).length === 1
          })
        }
      }
      
      selectors.push({
        selector: el.tagName.toLowerCase(),
        type: 'css',
        score: 30,
        isUnique: false
      })
      
      return selectors.sort((a, b) => b.score - a.score)
    }, event)
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
