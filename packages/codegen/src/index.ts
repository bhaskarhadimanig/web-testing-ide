import { RecordingSession, RecorderStep, CodegenOptions } from '@web-testing-ide/common'

export class CodeGenerator {
  private defaultOptions: CodegenOptions = {
    framework: 'playwright',
    language: 'typescript',
    defaultTimeoutMs: 30000,
    retryAttempts: 3,
    autoWait: true
  }

  generateCode(session: RecordingSession, options: Partial<CodegenOptions> = {}): string {
    const opts = { ...this.defaultOptions, ...options }

    switch (opts.framework) {
      case 'playwright':
        return this.generatePlaywrightCode(session, opts)
      case 'cypress':
        return this.generateCypressCode(session, opts)
      case 'selenium':
        return this.generateSeleniumCode(session, opts)
      default:
        throw new Error(`Unsupported framework: ${opts.framework}`)
    }
  }

  generatePlaywrightCode(session: RecordingSession, options: CodegenOptions = this.defaultOptions): string {
    const imports = this.generatePlaywrightImports()
    const testSetup = this.generatePlaywrightTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generatePlaywrightStep(step, options)).join('\n')
    const testTeardown = this.generatePlaywrightTestTeardown()

    return `${imports}\n\n${testSetup}\n${testSteps}\n${testTeardown}\n`
  }

  generateCypressCode(session: RecordingSession, options: CodegenOptions = this.defaultOptions): string {
    const testSetup = this.generateCypressTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generateCypressStep(step, options)).join('\n')
    const testTeardown = this.generateCypressTestTeardown()

    return `${testSetup}\n${testSteps}\n${testTeardown}\n`
  }

  generateSeleniumCode(session: RecordingSession, options: CodegenOptions = this.defaultOptions): string {
    const imports = this.generateSeleniumImports()
    const testSetup = this.generateSeleniumTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generateSeleniumStep(step, options)).join('\n')
    const testTeardown = this.generateSeleniumTestTeardown()

    return `${imports}\n\n${testSetup}\n${testSteps}\n${testTeardown}\n`
  }

  private generatePlaywrightImports(): string {
    return `import { test, expect, Page, Browser } from '@playwright/test'`
  }

  private generatePlaywrightTestSetup(session: RecordingSession, options: CodegenOptions): string {
    return `test.describe('${session.name}', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize(${JSON.stringify(session.viewport)})
  })

  test('${session.name}', async () => {`
  }

  private generatePlaywrightStep(step: RecorderStep, options: CodegenOptions): string {
    const timeout = options.defaultTimeoutMs || 30000
    const selector = step.selectors[0]?.selector || 'body'

    switch (step.type) {
      case 'navigate':
        return `    await page.goto('${step.url}', { timeout: ${timeout} })`
      
      case 'click':
        return `    await page.click('${selector}', { timeout: ${timeout} })`
      
      case 'doubleClick':
        return `    await page.dblclick('${selector}', { timeout: ${timeout} })`
      
      case 'type':
        return `    await page.fill('${selector}', '${step.value || ''}', { timeout: ${timeout} })`
      
      case 'select':
        return `    await page.selectOption('${selector}', '${step.value || ''}', { timeout: ${timeout} })`
      
      case 'wait':
        return `    await page.waitForTimeout(${step.value || 1000})`
      
      case 'screenshot':
        return `    await page.screenshot({ path: '${step.screenshot || 'screenshot.png'}' })`
      
      case 'assertion':
        if (step.assertion) {
          const assertion = step.assertion
          switch (assertion.type) {
            case 'exists':
            case 'visible':
              return `    await expect(page.locator('${selector}')).toBeVisible({ timeout: ${timeout} })`
            case 'containsText':
              return `    await expect(page.locator('${selector}')).toContainText('${assertion.expectedValue}', { timeout: ${timeout} })`
            case 'urlContains':
              return `    await expect(page).toHaveURL(/${assertion.expectedValue}/, { timeout: ${timeout} })`
            default:
              return `    // Unsupported assertion type: ${assertion.type}`
          }
        }
        return `    // Invalid assertion step`
      
      default:
        return `    // Unsupported step type: ${step.type}`
      
    }
  }

  private generatePlaywrightTestTeardown(): string {
    return `  })
})`
  }

  private generateCypressTestSetup(session: RecordingSession, options: CodegenOptions): string {
    return `describe('${session.name}', () => {
  beforeEach(() => {
    cy.viewport(${session.viewport.width}, ${session.viewport.height})
  })

  it('${session.name}', () => {`
  }

  private generateCypressStep(step: RecorderStep, options: CodegenOptions): string {
    const selector = step.selectors[0]?.selector || 'body'

    switch (step.type) {
      case 'navigate':
        return `    cy.visit('${step.url}')`
      
      case 'click':
        return `    cy.get('${selector}').click()`
      
      case 'doubleClick':
        return `    cy.get('${selector}').dblclick()`
      
      case 'type':
        return `    cy.get('${selector}').type('${step.value || ''}')`
      
      case 'select':
        return `    cy.get('${selector}').select('${step.value || ''}')`
      
      case 'wait':
        return `    cy.wait(${step.value || 1000})`
      
      case 'screenshot':
        return `    cy.screenshot('${step.screenshot || 'screenshot'}')`
      
      case 'assertion':
        if (step.assertion) {
          const assertion = step.assertion
          switch (assertion.type) {
            case 'exists':
            case 'visible':
              return `    cy.get('${selector}').should('be.visible')`
            case 'containsText':
              return `    cy.get('${selector}').should('contain.text', '${assertion.expectedValue}')`
            case 'urlContains':
              return `    cy.url().should('include', '${assertion.expectedValue}')`
            default:
              return `    // Unsupported assertion type: ${assertion.type}`
          }
        }
        return `    // Invalid assertion step`
      
      default:
        return `    // Unsupported step type: ${step.type}`
      
    }
  }

  private generateCypressTestTeardown(): string {
    return `  })
})`
  }

  private generateSeleniumImports(): string {
    return `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time`
  }

  private generateSeleniumTestSetup(session: RecordingSession, options: CodegenOptions): string {
    return `class Test${session.name.replace(/\s+/g, '')}:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.driver.set_window_size(${session.viewport.width}, ${session.viewport.height})
        self.wait = WebDriverWait(self.driver, ${(options.defaultTimeoutMs || 30000) / 1000})

    def test_${session.name.toLowerCase().replace(/\s+/g, '_')}(self):`
  }

  private generateSeleniumStep(step: RecorderStep, options: CodegenOptions): string {
    const selector = step.selectors[0]?.selector || 'body'

    switch (step.type) {
      case 'navigate':
        return `        self.driver.get('${step.url}')`
      
      case 'click':
        return `        self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}'))).click()`
      
      case 'type':
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        element.clear()
        element.send_keys('${step.value || ''}')`
      
      case 'wait':
        return `        time.sleep(${(Number(step.value) || 1000) / 1000})`
      
      case 'screenshot':
        return `        self.driver.save_screenshot('${step.screenshot || 'screenshot.png'}')`
      
      case 'assertion':
        if (step.assertion) {
          const assertion = step.assertion
          switch (assertion.type) {
            case 'exists':
            case 'visible':
              return `        assert self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '${selector}')))`
            case 'containsText':
              return `        assert '${assertion.expectedValue}' in self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}'))).text`
            case 'urlContains':
              return `        assert '${assertion.expectedValue}' in self.driver.current_url`
            default:
              return `        # Unsupported assertion type: ${assertion.type}`
          }
        }
        return `        # Invalid assertion step`
      
      default:
        return `        # Unsupported step type: ${step.type}`
    }
  }

  private generateSeleniumTestTeardown(): string {
    return `
    def teardown_method(self):
        self.driver.quit()`
  }
}
