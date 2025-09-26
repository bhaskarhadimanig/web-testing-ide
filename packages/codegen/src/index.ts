import { RecordingSession, RecorderStep, CodegenOptions, SelectorCandidate } from '@web-testing-ide/common'

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
    const consolidatedSteps = this.consolidateTypingSteps(session.steps)
    const testSteps = consolidatedSteps.map(step => this.generateSeleniumStep(step, options)).join('\n')
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
      
      case 'checkbox':
        return step.value ? `    await page.check('${selector}', { timeout: ${timeout} })` : `    await page.uncheck('${selector}', { timeout: ${timeout} })`
      
      case 'radio':
        return `    await page.check('${selector}', { timeout: ${timeout} })`
      
      case 'select':
        if (typeof step.value === 'object' && step.value && 'value' in step.value) {
          return `    await page.selectOption('${selector}', '${step.value.value}', { timeout: ${timeout} })`
        }
        return `    await page.selectOption('${selector}', '${step.value || ''}', { timeout: ${timeout} })`
      
      case 'focus':
        return `    await page.focus('${selector}', { timeout: ${timeout} })`
      
      case 'submit':
        return `    await page.click('${selector}[type="submit"]', { timeout: ${timeout} })`
      
      case 'hover':
        return `    await page.hover('${selector}', { timeout: ${timeout} })`
      
      case 'keypress':
        if (typeof step.value === 'object' && step.value && 'key' in step.value) {
          return `    await page.keyboard.press('${step.value.key}')`
        }
        return `    await page.keyboard.press('Enter')`
      
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
      
      case 'checkbox':
        return step.value ? `    cy.get('${selector}').check()` : `    cy.get('${selector}').uncheck()`
      
      case 'radio':
        return `    cy.get('${selector}').check()`
      
      case 'select':
        if (typeof step.value === 'object' && step.value && 'value' in step.value) {
          return `    cy.get('${selector}').select('${step.value.value}')`
        }
        return `    cy.get('${selector}').select('${step.value || ''}')`
      
      case 'focus':
        return `    cy.get('${selector}').focus()`
      
      case 'submit':
        return `    cy.get('${selector}').submit()`
      
      case 'hover':
        return `    cy.get('${selector}').trigger('mouseover')`
      
      case 'keypress':
        if (typeof step.value === 'object' && step.value && 'key' in step.value) {
          return `    cy.get('body').type('{${String(step.value.key).toLowerCase()}}')`
        }
        return `    cy.get('body').type('{enter}')`
      
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
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.Keys;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.OutputType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import java.time.Duration;
`
    }
    return `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import time`
  }

  private generateSeleniumTestSetup(session: RecordingSession, options: CodegenOptions): string {
    if ((options.language as string) === 'java') {
      const className = session.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') + 'Test'
      return `
public class ${className} {
    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    public void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--user-data-dir=/tmp/chrome-selenium-" + System.currentTimeMillis() + "-" + Math.random());
        options.addArguments("--remote-debugging-port=0");
        driver = new ChromeDriver(options);
        driver.manage().window().setSize(new Dimension(${session.viewport.width}, ${session.viewport.height}));
        wait = new WebDriverWait(driver, Duration.ofSeconds(30));
    }

    @Test
    public void test${className}() {`
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
    const locatorMethod = this.getSeleniumLocatorMethod(selector, step.selectors)

    switch (step.type) {
      case 'navigate':
        return isJava 
          ? `        driver.get("${step.url}");`
          : `        self.driver.get('${step.url}')`
      
      case 'click':
        return isJava
          ? `        wait.until(ExpectedConditions.elementToBeClickable(${locatorMethod})).click();`
          : `        self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}'))).click()`
      
      case 'type': {
        if (isJava) {
          return `        WebElement element = wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod}));
        element.clear();
        element.sendKeys("${step.value || ''}");`
        }
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        element.clear()
        element.send_keys('${step.value || ''}')`
      }
      
      case 'checkbox':
      case 'radio': {
        if (isJava) {
          return `        WebElement element = wait.until(ExpectedConditions.elementToBeClickable(${locatorMethod}));
        if (${step.value ? 'true' : 'false'} != element.isSelected()) {
            element.click();
        }`
        }
        return `        element = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}')))
        if ${step.value ? 'True' : 'False'} != element.is_selected():
            element.click()`
      }
      
      case 'select': {
        if (isJava) {
          const value = typeof step.value === 'object' && step.value && 'value' in step.value ? step.value.value : step.value
          return `        Select select = new Select(wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod})));
        select.selectByValue("${value || ''}");`
        }
        const value = typeof step.value === 'object' && step.value && 'value' in step.value ? step.value.value : step.value
        return `        select_element = Select(self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}'))))
        select_element.select_by_value('${value || ''}')`
      }
      
      case 'focus': {
        if (isJava) {
          return `        Actions actions = new Actions(driver);
        actions.moveToElement(wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod}))).click().perform();`
        }
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        element.click()`
      }
      
      case 'submit': {
        if (isJava) {
          return `        wait.until(ExpectedConditions.elementToBeClickable(${locatorMethod})).submit();`
        }
        return `        self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '${selector}'))).submit()`
      }
      
      case 'hover': {
        if (isJava) {
          return `        Actions actions = new Actions(driver);
        actions.moveToElement(wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod}))).perform();`
        }
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        ActionChains(self.driver).move_to_element(element).perform()`
      }
      
      case 'keypress': {
        if (isJava) {
          const key = typeof step.value === 'object' && step.value && 'key' in step.value ? 
            (String(step.value.key) === 'Enter' ? 'ENTER' : String(step.value.key).toUpperCase()) : 'ENTER'
          return `        wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod})).sendKeys(Keys.${key});`
        }
        const key = typeof step.value === 'object' && step.value && 'key' in step.value ? String(step.value.key) : 'ENTER'
        return `        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '${selector}')))
        element.send_keys(Keys.${key.toUpperCase()})`
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
                ? `        assert wait.until(ExpectedConditions.visibilityOfElementLocated(${locatorMethod})) != null;`
                : `        assert self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '${selector}')))`
            case 'containsText':
              return isJava
                ? `        assert wait.until(ExpectedConditions.presenceOfElementLocated(${locatorMethod})).getText().contains("${assertion.expectedValue}");`
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

  private getSeleniumLocatorMethod(selector: string, selectors: SelectorCandidate[]): string {
    if (!selectors || selectors.length === 0) {
      // Handle Playwright-style selectors that need conversion
      if (selector.includes(':has-text(')) {
        const textMatch = selector.match(/:has-text\("([^"]+)"\)/)
        if (textMatch) {
          const text = textMatch[1]
          const element = selector.split(':has-text(')[0] || '*'
          return `By.xpath("//${element}[contains(text(), '${text}')]")`
        }
      }
      
      // Handle CSS selectors that start with element:has-text()
      if (selector.match(/^(span|button|a|div|p|input):has-text\(/)) {
        const elementMatch = selector.match(/^(\w+):has-text\("([^"]+)"\)/)
        if (elementMatch) {
          const element = elementMatch[1]
          const text = elementMatch[2]
          return `By.xpath("//${element}[contains(text(), '${text}')]")`
        }
      }
      
      // Handle ID selectors
      if (selector.startsWith('#')) {
        return `By.id("${selector.substring(1)}")`
      }
      
      // Handle class selectors
      if (selector.startsWith('.')) {
        return `By.className("${selector.substring(1)}")`
      }
      
      return `By.cssSelector("${selector}")`
    }
    
    const bestSelector = selectors[0]
    
    if (bestSelector.type === 'id') {
      const id = selector.replace('#', '')
      return `By.id("${id}")`
    }
    
    if (bestSelector.type === 'name') {
      const name = selector.replace(/\[name="([^"]+)"\]/, '$1')
      return `By.name("${name}")`
    }
    
    if (bestSelector.type === 'xpath') {
      return `By.xpath("${selector}")`
    }
    
    if (bestSelector.type === 'css') {
      if (selector.includes(':has-text(')) {
        const textMatch = selector.match(/:has-text\("([^"]+)"\)/)
        if (textMatch) {
          const text = textMatch[1]
          const element = selector.split(':has-text(')[0] || '*'
          if (element && element !== '*') {
            return `By.xpath("//${element}[contains(text(), '${text}')]")`
          } else {
            return `By.xpath("//*[contains(text(), '${text}')]")`
          }
        }
      }
      
      if (selector.match(/^(span|button|a|div|p):has-text\(/)) {
        const elementMatch = selector.match(/^(\w+):has-text\("([^"]+)"\)/)
        if (elementMatch) {
          const element = elementMatch[1]
          const text = elementMatch[2]
          return `By.xpath("//${element}[contains(text(), '${text}')]")`
        }
      }
      
      if (selector.includes('>>')) {
        const parts = selector.split('>>')
        const lastPart = parts[parts.length - 1].trim()
        return `By.cssSelector("${lastPart}")`
      }
      
      return `By.cssSelector("${selector}")`
    }
    
    if (bestSelector.type === 'data-testid') {
      const testId = selector.replace(/\[data-testid="([^"]+)"\]/, '$1')
      return `By.cssSelector("[data-testid='${testId}']")`
    }
    
    if (bestSelector.type === 'aria-label') {
      const ariaLabel = selector.replace(/\[aria-label="([^"]+)"\]/, '$1')
      return `By.cssSelector("[aria-label='${ariaLabel}']")`
    }
    
    if (bestSelector.type === 'text') {
      const text = selector.replace('text=', '').replace('link=', '')
      return `By.linkText("${text}")`
    }
    
    return `By.cssSelector("${selector}")`
  }

  private consolidateTypingSteps(steps: RecorderStep[]): RecorderStep[] {
    const consolidated: RecorderStep[] = []
    let i = 0
    
    while (i < steps.length) {
      const currentStep = steps[i]
      
      if (currentStep.type === 'type' && currentStep.selectors[0]) {
        const sameElementSteps = [currentStep]
        let j = i + 1
        
        while (j < steps.length && 
               steps[j].type === 'type' && 
               steps[j].selectors[0]?.selector === currentStep.selectors[0].selector) {
          sameElementSteps.push(steps[j])
          j++
        }
        
        if (sameElementSteps.length > 1) {
          const finalStep = sameElementSteps[sameElementSteps.length - 1]
          consolidated.push({
            ...finalStep,
            value: finalStep.value
          })
          i = j
        } else {
          consolidated.push(currentStep)
          i++
        }
      } else {
        consolidated.push(currentStep)
        i++
      }
    }
    
    return consolidated
  }
}

export default CodeGenerator
