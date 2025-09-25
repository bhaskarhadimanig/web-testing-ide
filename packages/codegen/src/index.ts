import { RecordingSession, RecorderStep, CodegenOptions } from '@web-testing-ide/common'

export class CodeGenerator {
  private defaultOptions: CodegenOptions = {
    framework: 'playwright',
    language: 'typescript' as const,
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

  generatePlaywrightCode(session: RecordingSession, options: CodegenOptions): string {
    const imports = this.generatePlaywrightImports()
    const testSetup = this.generatePlaywrightTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generatePlaywrightStep(step, options)).join('\n')
    const testTeardown = this.generatePlaywrightTestTeardown()

    return `${imports}\n\n${testSetup}\n${testSteps}\n${testTeardown}\n`
  }

  generateCypressCode(session: RecordingSession, options: CodegenOptions): string {
    const testSetup = this.generateCypressTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generateCypressStep(step, options)).join('\n')
    const testTeardown = this.generateCypressTestTeardown()

    return `${testSetup}\n${testSteps}\n${testTeardown}\n`
  }

  generateSeleniumCode(session: RecordingSession, options: CodegenOptions): string {
    const imports = this.generateSeleniumImports(options.language)
    const testSetup = this.generateSeleniumTestSetup(session, options)
    const testSteps = session.steps.map(step => this.generateSeleniumStep(step, options)).join('\n')
    const testTeardown = this.generateSeleniumTestTeardown(options.language)

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

  private generateSeleniumImports(language: string = 'python'): string {
    if (language === 'java') {
      return `import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.OutputType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import java.time.Duration;`
    }
    return `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time`
  }

  private generateSeleniumTestSetup(session: RecordingSession, options: CodegenOptions): string {
    if ((options.language as string) === 'java') {
      const className = session.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') + 'Test'
      return `public class ${className} {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    public void setUp() {
        driver = new ChromeDriver();
        driver.manage().window().setSize(new Dimension(${session.viewport.width}, ${session.viewport.height}));
        wait = new WebDriverWait(driver, Duration.ofSeconds(${(options.defaultTimeoutMs || 30000) / 1000}));
    }

    @Test
    public void test${session.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}() {`
    }
    return `class Test${session.name.replace(/\s+/g, '')}:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.driver.set_window_size(${session.viewport.width}, ${session.viewport.height})
        self.wait = WebDriverWait(self.driver, ${(options.defaultTimeoutMs || 30000) / 1000})

    def test_${session.name.toLowerCase().replace(/\s+/g, '_')}(self):`
  }

  private generateSeleniumStep(step: RecorderStep, options: CodegenOptions): string {
    const selector = step.selectors[0]?.selector || 'body'
    const isJava = (options.language as string) === 'java'

    switch (step.type) {
      case 'navigate':
        return isJava 
          ? `        driver.get("${step.url}");`
          : `        self.driver.get('${step.url}')`
      
      case 'click':
        return isJava
          ? `        wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("${selector}"))).click();`
          : `        self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}'))).click()`
      
      case 'type': {
        if (isJava) {
          return `        WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${selector}")));
        element.clear();
        element.sendKeys("${step.value || ''}");`
        }
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        element.clear()
        element.send_keys('${step.value || ''}')`
      }
      
      case 'wait': {
        const waitTime = Number(step.value) || 1000
        return isJava
          ? `        try { Thread.sleep(${waitTime}); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }`
          : `        time.sleep(${waitTime / 1000})`
      }
      
      case 'screenshot':
        return isJava
          ? `        ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);`
          : `        self.driver.save_screenshot('${step.screenshot || 'screenshot.png'}')`
      
      case 'assertion':
        if (step.assertion) {
          const assertion = step.assertion
          switch (assertion.type) {
            case 'exists':
            case 'visible':
              return isJava
                ? `        assert wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("${selector}"))) != null;`
                : `        assert self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '${selector}')))`
            case 'containsText':
              return isJava
                ? `        assert wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("${selector}"))).getText().contains("${assertion.expectedValue}");`
                : `        assert '${assertion.expectedValue}' in self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}'))).text`
            case 'urlContains':
              return isJava
                ? `        assert driver.getCurrentUrl().contains("${assertion.expectedValue}");`
                : `        assert '${assertion.expectedValue}' in self.driver.current_url`
            default:
              return isJava ? `        // Unsupported assertion type: ${assertion.type}` : `        # Unsupported assertion type: ${assertion.type}`
          }
        }
        return isJava ? `        // Invalid assertion step` : `        # Invalid assertion step`
      
      default:
        return isJava ? `        // Unsupported step type: ${step.type}` : `        # Unsupported step type: ${step.type}`
    }
  }

  private generateSeleniumTestTeardown(language: string = 'python'): string {
    if (language === 'java') {
      return `    }

    @AfterEach
    public void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }
}`
    }
    return `
    def teardown_method(self):
        self.driver.quit()`
  }
}
