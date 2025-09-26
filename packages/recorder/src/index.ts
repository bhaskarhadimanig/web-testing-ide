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

  private async captureStep(type: RecorderStep['type'], url: string, selectors: SelectorCandidate[], value?: any, elementData?: any): Promise<void> {
    if (!this.isRecording || !this.page || !this.recording) return

    const stepId = `step-${String(++this.stepCounter).padStart(3, '0')}`
    const screenshotPath = `screenshots/${stepId}.png`
    const fullScreenshotPath = join(process.cwd(), 'recordings', this.recording.id, screenshotPath)
    
    try {
      await this.page.screenshot({ 
        path: fullScreenshotPath,
        fullPage: false,
        quality: 90,
        type: 'png',
        animations: 'disabled' // Disable animations for consistent screenshots
      })

      let elementScreenshot: string | undefined
      if (elementData?.boundingBox && elementData.boundingBox.width > 0 && elementData.boundingBox.height > 0) {
        const elementScreenshotPath = `screenshots/${stepId}-element.png`
        const fullElementScreenshotPath = join(process.cwd(), 'recordings', this.recording.id, elementScreenshotPath)
        
        try {
          await this.page.screenshot({
            path: fullElementScreenshotPath,
            clip: {
              x: Math.max(0, elementData.boundingBox.x - 10),
              y: Math.max(0, elementData.boundingBox.y - 10),
              width: Math.min(this.recording.viewport.width, elementData.boundingBox.width + 20),
              height: Math.min(this.recording.viewport.height, elementData.boundingBox.height + 20)
            },
            quality: 95,
            type: 'png'
          })
          elementScreenshot = elementScreenshotPath
        } catch (clipError) {
          console.warn('Failed to capture element screenshot:', clipError)
        }
      }

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
          tagName: elementData?.tagName || 'html',
          elementAttributes: elementData?.attributes || {},
          boundingBox: elementData?.boundingBox,
          innerText: elementData?.textContent,
          elementScreenshot
        }
      }

      this.steps.push(step)
      
      console.log(`Captured step ${stepId}: ${type} with ${selectors.length} selectors`)
      
    } catch (error) {
      console.error(`Failed to capture screenshot for step ${stepId}:`, error)
      
      const step: RecorderStep = {
        id: stepId,
        type,
        timestamp: Date.now(),
        url,
        viewport: this.recording.viewport,
        selectors,
        value,
        screenshot: undefined,
        metadata: {
          tagName: elementData?.tagName || 'html',
          elementAttributes: elementData?.attributes || {},
          boundingBox: elementData?.boundingBox,
          innerText: elementData?.textContent,
          screenshotError: error instanceof Error ? error.message : String(error)
        }
      }

      this.steps.push(step)
    }
  }

  private async setupDOMEventListeners(): Promise<void> {
    if (!this.page) return

    await this.page.evaluate(() => {
      const captureEvent = (type: string, element: Element, value?: any, additionalData?: any) => {
        (window as any).__recordingEvents = (window as any).__recordingEvents || []
        ;(window as any).__recordingEvents.push({ 
          type, 
          element, 
          value, 
          timestamp: Date.now(),
          elementData: {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent?.trim(),
            attributes: Array.from(element.attributes || []).reduce((acc: any, attr) => {
              acc[attr.name] = attr.value
              return acc
            }, {}),
            boundingBox: element.getBoundingClientRect(),
            ...additionalData
          }
        })
      }

      const generateAdvancedSelectors = (element: Element) => {
        const selectors: any[] = []
        
        if (element.id) {
          selectors.push({
            selector: `#${element.id}`,
            type: 'id',
            score: 100,
            isUnique: document.querySelectorAll(`#${element.id}`).length === 1
          })
          selectors.push({
            selector: `//*[@id="${element.id}"]`,
            type: 'xpath',
            score: 95,
            isUnique: true
          })
        }
        
        const testId = element.getAttribute('data-testid')
        if (testId) {
          selectors.push({
            selector: `[data-testid="${testId}"]`,
            type: 'data-testid',
            score: 90,
            isUnique: document.querySelectorAll(`[data-testid="${testId}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@data-testid="${testId}"]`,
            type: 'xpath',
            score: 88,
            isUnique: true
          })
        }
        
        const nameAttr = element.getAttribute('name')
        if (nameAttr) {
          selectors.push({
            selector: `[name="${nameAttr}"]`,
            type: 'css',
            score: 85,
            isUnique: document.querySelectorAll(`[name="${nameAttr}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@name="${nameAttr}"]`,
            type: 'xpath',
            score: 83,
            isUnique: document.querySelectorAll(`[name="${nameAttr}"]`).length === 1
          })
        }
        
        const ariaLabel = element.getAttribute('aria-label')
        if (ariaLabel) {
          selectors.push({
            selector: `[aria-label="${ariaLabel}"]`,
            type: 'aria-label',
            score: 82,
            isUnique: document.querySelectorAll(`[aria-label="${ariaLabel}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@aria-label="${ariaLabel}"]`,
            type: 'xpath',
            score: 80,
            isUnique: document.querySelectorAll(`[aria-label="${ariaLabel}"]`).length === 1
          })
        }
        
        if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'SPAN') {
          const text = element.textContent?.trim()
          if (text && text.length < 50) {
            selectors.push({
              selector: `${element.tagName.toLowerCase()}:has-text("${text}")`,
              type: 'text',
              score: 75,
              isUnique: Array.from(document.querySelectorAll(element.tagName.toLowerCase())).filter((e: any) => e.textContent?.trim() === text).length === 1
            })
            selectors.push({
              selector: `//${element.tagName.toLowerCase()}[contains(text(),"${text}")]`,
              type: 'xpath',
              score: 73,
              isUnique: Array.from(document.querySelectorAll(element.tagName.toLowerCase())).filter((e: any) => e.textContent?.trim() === text).length === 1
            })
          }
        }
        
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter((c: string) => c.trim())
          if (classes.length > 0) {
            const classSelector = '.' + classes.join('.')
            const isUnique = document.querySelectorAll(classSelector).length === 1
            selectors.push({
              selector: classSelector,
              type: 'css',
              score: isUnique ? 70 : 50,
              isUnique
            })
            const classXPath = `//*[contains(@class,"${classes[0]}")]`
            selectors.push({
              selector: classXPath,
              type: 'xpath',
              score: isUnique ? 68 : 48,
              isUnique
            })
          }
        }
        
        const generateAdvancedXPath = (el: Element): string => {
          if (el.id) {
            return `//*[@id="${el.id}"]`
          }
          
          const parts: string[] = []
          let current: Element | null = el
          
          while (current && current.nodeType === 1) {
            let selector = current.tagName.toLowerCase()
            
            const siblings = Array.from(current.parentNode?.children || [])
              .filter(sibling => sibling.tagName === current!.tagName)
            
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1
              selector += `[${index}]`
            }
            
            if (current.id) {
              selector = `${current.tagName.toLowerCase()}[@id="${current.id}"]`
              parts.unshift(selector)
              break
            } else if (current.className) {
              const firstClass = current.className.split(' ')[0]
              if (firstClass) {
                selector += `[@class="${firstClass}"]`
              }
            }
            
            parts.unshift(selector)
            current = current.parentElement
            
            if (parts.length > 6) break
          }
          
          return '//' + parts.join('/')
        }
        
        const advancedXPath = generateAdvancedXPath(element)
        selectors.push({
          selector: advancedXPath,
          type: 'xpath',
          score: 60,
          isUnique: false
        })
        
        selectors.push({
          selector: element.tagName.toLowerCase(),
          type: 'css',
          score: 30,
          isUnique: false
        })
        
        return selectors.sort((a, b) => b.score - a.score)
      }

      document.addEventListener('click', (e) => {
        const selectors = generateAdvancedSelectors(e.target as Element)
        captureEvent('click', e.target as Element, { selectors }, {
          clickCoordinates: { x: e.clientX, y: e.clientY },
          modifiers: {
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
          }
        })
      }, true)

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          const selectors = generateAdvancedSelectors(target)
          captureEvent('type', target, { 
            value: target.value, 
            selectors,
            inputType: target.type,
            placeholder: target.placeholder
          })
        }
      }, true)

      document.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement
        const selectors = generateAdvancedSelectors(target)
        let value: any = target.value
        let eventType = 'select'
        
        if (target.type === 'checkbox') {
          value = (target as HTMLInputElement).checked
          eventType = 'checkbox'
        } else if (target.type === 'radio') {
          value = (target as HTMLInputElement).checked
          eventType = 'radio'
        } else if (target.tagName === 'SELECT') {
          eventType = 'select'
          const selectElement = target as HTMLSelectElement
          value = {
            value: selectElement.value,
            selectedIndex: selectElement.selectedIndex,
            selectedText: selectElement.options[selectElement.selectedIndex]?.text
          }
        }
        
        captureEvent(eventType, target, { value, selectors })
      }, true)

      document.addEventListener('dblclick', (e) => {
        const selectors = generateAdvancedSelectors(e.target as Element)
        captureEvent('doubleClick', e.target as Element, { selectors })
      }, true)

      document.addEventListener('focus', (e) => {
        const target = e.target as Element
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          const selectors = generateAdvancedSelectors(target)
          captureEvent('focus', target, { selectors })
        }
      }, true)

      document.addEventListener('submit', (e) => {
        const selectors = generateAdvancedSelectors(e.target as Element)
        const formData = new FormData(e.target as HTMLFormElement)
        const formValues: any = {}
        const inputs = (e.target as HTMLFormElement).querySelectorAll('input, select, textarea')
        inputs.forEach((input) => {
          if (input instanceof HTMLInputElement) {
            if (input.type === 'checkbox' || input.type === 'radio') {
              if (input.checked && input.name) {
                formValues[input.name] = input.value
              }
            } else if (input.name) {
              formValues[input.name] = input.value
            }
          } else if ((input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement) && input.name) {
            formValues[input.name] = input.value
          }
        })
        captureEvent('submit', e.target as Element, { selectors, formData: formValues })
      }, true)

      document.addEventListener('keydown', (e) => {
        const target = e.target as Element
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
          const selectors = generateAdvancedSelectors(target)
          captureEvent('keypress', target, { 
            key: e.key, 
            selectors,
            keyCode: e.keyCode,
            modifiers: {
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
              metaKey: e.metaKey
            }
          })
        }
      }, true)

      let hoverTimeout: any
      document.addEventListener('mouseover', (e) => {
        clearTimeout(hoverTimeout)
        hoverTimeout = setTimeout(() => {
          const target = e.target as Element
          if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button') {
            const selectors = generateAdvancedSelectors(target)
            captureEvent('hover', target, { selectors })
          }
        }, 500) // Only capture hover after 500ms
      }, true)

      document.addEventListener('mouseout', () => {
        clearTimeout(hoverTimeout)
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
          const value = event.value && typeof event.value === 'object' ? event.value.value : event.value
          await this.captureStep(event.type, this.page!.url(), selectors, value, event.elementData)
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
    
    if (event.value && event.value.selectors) {
      return event.value.selectors
    }
    
    try {
      const selectors = await this.page.evaluate((eventData) => {
        const el = eventData.element
        if (!el) return []
        
        const selectors: any[] = []
        
        if (el.id) {
          selectors.push({
            selector: `#${el.id}`,
            type: 'id',
            score: 100,
            isUnique: document.querySelectorAll(`#${el.id}`).length === 1
          })
          selectors.push({
            selector: `//*[@id="${el.id}"]`,
            type: 'xpath',
            score: 95,
            isUnique: true
          })
        }
        
        const testId = el.getAttribute('data-testid')
        if (testId) {
          selectors.push({
            selector: `[data-testid="${testId}"]`,
            type: 'data-testid',
            score: 90,
            isUnique: document.querySelectorAll(`[data-testid="${testId}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@data-testid="${testId}"]`,
            type: 'xpath',
            score: 88,
            isUnique: true
          })
        }
        
        const nameAttr = el.getAttribute('name')
        if (nameAttr) {
          selectors.push({
            selector: `[name="${nameAttr}"]`,
            type: 'css',
            score: 85,
            isUnique: document.querySelectorAll(`[name="${nameAttr}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@name="${nameAttr}"]`,
            type: 'xpath',
            score: 83,
            isUnique: document.querySelectorAll(`[name="${nameAttr}"]`).length === 1
          })
        }
        
        const ariaLabel = el.getAttribute('aria-label')
        if (ariaLabel) {
          selectors.push({
            selector: `[aria-label="${ariaLabel}"]`,
            type: 'aria-label',
            score: 82,
            isUnique: document.querySelectorAll(`[aria-label="${ariaLabel}"]`).length === 1
          })
          selectors.push({
            selector: `//*[@aria-label="${ariaLabel}"]`,
            type: 'xpath',
            score: 80,
            isUnique: document.querySelectorAll(`[aria-label="${ariaLabel}"]`).length === 1
          })
        }
        
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SPAN') {
          const text = el.textContent?.trim()
          if (text && text.length < 50) {
            selectors.push({
              selector: `${el.tagName.toLowerCase()}:has-text("${text}")`,
              type: 'text',
              score: 75,
              isUnique: Array.from(document.querySelectorAll(el.tagName.toLowerCase())).filter((e: any) => e.textContent?.trim() === text).length === 1
            })
            selectors.push({
              selector: `//${el.tagName.toLowerCase()}[contains(text(),"${text}")]`,
              type: 'xpath',
              score: 73,
              isUnique: Array.from(document.querySelectorAll(el.tagName.toLowerCase())).filter((e: any) => e.textContent?.trim() === text).length === 1
            })
          }
        }
        
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter((c: string) => c.trim())
          if (classes.length > 0) {
            const classSelector = '.' + classes.join('.')
            const isUnique = document.querySelectorAll(classSelector).length === 1
            selectors.push({
              selector: classSelector,
              type: 'css',
              score: isUnique ? 70 : 50,
              isUnique
            })
            selectors.push({
              selector: `//*[contains(@class,"${classes[0]}")]`,
              type: 'xpath',
              score: isUnique ? 68 : 48,
              isUnique
            })
          }
        }
        
        const generateAdvancedXPath = (element: Element): string => {
          if (element.id) {
            return `//*[@id="${element.id}"]`
          }
          
          const parts: string[] = []
          let current: Element | null = element
          
          while (current && current.nodeType === 1) {
            let selector = current.tagName.toLowerCase()
            
            const siblings = Array.from(current.parentNode?.children || [])
              .filter(sibling => sibling.tagName === current!.tagName)
            
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1
              selector += `[${index}]`
            }
            
            if (current.id) {
              selector = `${current.tagName.toLowerCase()}[@id="${current.id}"]`
              parts.unshift(selector)
              break
            } else if (current.className) {
              const firstClass = current.className.split(' ')[0]
              if (firstClass) {
                selector += `[@class="${firstClass}"]`
              }
            }
            
            parts.unshift(selector)
            current = current.parentElement
            
            if (parts.length > 6) break
          }
          
          return '//' + parts.join('/')
        }
        
        const advancedXPath = generateAdvancedXPath(el)
        selectors.push({
          selector: advancedXPath,
          type: 'xpath',
          score: 60,
          isUnique: false
        })
        
        selectors.push({
          selector: el.tagName.toLowerCase(),
          type: 'css',
          score: 30,
          isUnique: false
        })
        
        return selectors.sort((a, b) => b.score - a.score)
      }, event)
      
      return selectors
    } catch (error) {
      console.error('Error generating selectors:', error)
      return []
    }
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
