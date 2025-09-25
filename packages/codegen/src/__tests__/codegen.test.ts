import { CodeGenerator } from '../index'
import { RecordingSession } from '@web-testing-ide/common'

const mockSession: RecordingSession = {
  id: 'test-session',
  name: 'Test Recording',
  url: 'https://example.com',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  viewport: { width: 1280, height: 720 },
  userAgent: 'Mozilla/5.0 Test',
  steps: [
    {
      id: 'step-001',
      type: 'navigate',
      timestamp: Date.now(),
      url: 'https://example.com',
      viewport: { width: 1280, height: 720 },
      selectors: [],
      metadata: { tagName: 'html' }
    },
    {
      id: 'step-002',
      type: 'click',
      timestamp: Date.now(),
      url: 'https://example.com',
      viewport: { width: 1280, height: 720 },
      selectors: [
        { selector: '#submit-btn', type: 'id', score: 130, isUnique: true }
      ],
      metadata: { tagName: 'button' }
    },
    {
      id: 'step-003',
      type: 'type',
      timestamp: Date.now(),
      url: 'https://example.com',
      viewport: { width: 1280, height: 720 },
      selectors: [
        { selector: '[data-testid="username"]', type: 'data-testid', score: 120, isUnique: true }
      ],
      value: 'testuser',
      metadata: { tagName: 'input' }
    }
  ],
  metadata: {
    description: 'Test session',
    tags: ['test'],
    duration: 5000,
    totalSteps: 3
  }
}

describe('CodeGenerator', () => {
  let generator: CodeGenerator

  beforeEach(() => {
    generator = new CodeGenerator()
  })

  describe('generatePlaywrightCode', () => {
    test('should generate valid Playwright test structure', () => {
      const code = generator.generatePlaywrightCode(mockSession)

      expect(code).toContain("import { test, expect, Page, Browser } from '@playwright/test'")
      expect(code).toContain("test.describe('Test Recording'")
      expect(code).toContain('let page: Page')
      expect(code).toContain('test.beforeEach')
      expect(code).toContain("test('Test Recording'")
    })

    test('should generate navigation steps', () => {
      const code = generator.generatePlaywrightCode(mockSession)

      expect(code).toContain("await page.goto('https://example.com'")
    })

    test('should generate click steps with selectors', () => {
      const code = generator.generatePlaywrightCode(mockSession)

      expect(code).toContain("await page.click('#submit-btn'")
    })

    test('should generate type steps with values', () => {
      const code = generator.generatePlaywrightCode(mockSession)

      expect(code).toContain("await page.fill('[data-testid=\"username\"]', 'testuser'")
    })

    test('should include timeout configuration', () => {
      const code = generator.generatePlaywrightCode(mockSession, {
        framework: 'playwright',
        language: 'typescript',
        defaultTimeoutMs: 45000,
        retryAttempts: 3,
        autoWait: true
      })

      expect(code).toContain('timeout: 45000')
    })

    test('should set viewport size', () => {
      const code = generator.generatePlaywrightCode(mockSession)

      expect(code).toContain('await page.setViewportSize({"width":1280,"height":720})')
    })
  })

  describe('generateCypressCode', () => {
    test('should generate valid Cypress test structure', () => {
      const code = generator.generateCypressCode(mockSession)

      expect(code).toContain("describe('Test Recording'")
      expect(code).toContain('beforeEach')
      expect(code).toContain("it('Test Recording'")
      expect(code).toContain('cy.viewport(1280, 720)')
    })

    test('should generate Cypress commands', () => {
      const code = generator.generateCypressCode(mockSession)

      expect(code).toContain("cy.visit('https://example.com')")
      expect(code).toContain("cy.get('#submit-btn').click()")
      expect(code).toContain("cy.get('[data-testid=\"username\"]').type('testuser')")
    })
  })

  describe('generateSeleniumCode', () => {
    test('should generate valid Selenium Python test structure', () => {
      const code = generator.generateSeleniumCode(mockSession)

      expect(code).toContain('from selenium import webdriver')
      expect(code).toContain('class TestTestRecording:')
      expect(code).toContain('def setup_method(self):')
      expect(code).toContain('def test_test_recording(self):')
      expect(code).toContain('def teardown_method(self):')
    })

    test('should generate Selenium commands', () => {
      const code = generator.generateSeleniumCode(mockSession)

      expect(code).toContain("self.driver.get('https://example.com')")
      expect(code).toContain('element_to_be_clickable')
      expect(code).toContain('presence_of_element_located')
    })
  })

  describe('generateCode', () => {
    test('should route to correct framework generator', () => {
      const playwrightCode = generator.generateCode(mockSession, { framework: 'playwright' })
      const cypressCode = generator.generateCode(mockSession, { framework: 'cypress' })
      const seleniumCode = generator.generateCode(mockSession, { framework: 'selenium' })

      expect(playwrightCode).toContain('@playwright/test')
      expect(cypressCode).toContain('cy.visit')
      expect(seleniumCode).toContain('from selenium')
    })

    test('should throw error for unsupported framework', () => {
      expect(() => {
        generator.generateCode(mockSession, { framework: 'unsupported' as any })
      }).toThrow('Unsupported framework: unsupported')
    })

    test('should use default options when none provided', () => {
      const code = generator.generateCode(mockSession)

      expect(code).toContain('@playwright/test')
      expect(code).toContain('timeout: 30000')
    })
  })
})
