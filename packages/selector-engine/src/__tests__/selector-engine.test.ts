import { SelectorEngine } from '../index'
import { SelectorCandidate } from '@web-testing-ide/common'

const mockElement = (attributes: Record<string, string>, textContent?: string): Element => {
  const element = {
    id: attributes.id || '',
    className: attributes.class || '',
    textContent: textContent || '',
    tagName: attributes.tagName || 'DIV',
    getAttribute: (name: string) => attributes[name] || null,
    parentNode: null,
    parentElement: null,
    nodeType: 1
  } as unknown as Element

  return element
}

describe('SelectorEngine', () => {
  let engine: SelectorEngine

  beforeEach(() => {
    engine = new SelectorEngine()
  })

  describe('generateSelectors', () => {
    test('should prioritize ID selectors', () => {
      const element = mockElement({ id: 'submit-btn', class: 'btn primary' })
      const selectors = engine.generateSelectors(element)

      expect(selectors[0].type).toBe('id')
      expect(selectors[0].selector).toBe('#submit-btn')
      expect(selectors[0].score).toBeGreaterThan(100)
      expect(selectors[0].isUnique).toBe(true)
    })

    test('should generate data-testid selectors', () => {
      const element = mockElement({ 'data-testid': 'login-form' })
      const selectors = engine.generateSelectors(element)

      const testIdSelector = selectors.find(s => s.type === 'data-testid')
      expect(testIdSelector).toBeDefined()
      expect(testIdSelector!.selector).toBe('[data-testid="login-form"]')
      expect(testIdSelector!.isUnique).toBe(true)
    })

    test('should generate aria-label selectors', () => {
      const element = mockElement({ 'aria-label': 'Close dialog' })
      const selectors = engine.generateSelectors(element)

      const ariaSelector = selectors.find(s => s.type === 'aria-label')
      expect(ariaSelector).toBeDefined()
      expect(ariaSelector!.selector).toBe('[aria-label="Close dialog"]')
    })

    test('should generate CSS class selectors', () => {
      const element = mockElement({ class: 'btn primary large' })
      const selectors = engine.generateSelectors(element)

      const cssSelector = selectors.find(s => s.type === 'css')
      expect(cssSelector).toBeDefined()
      expect(cssSelector!.selector).toBe('.btn.primary.large')
    })

    test('should generate text selectors for short text', () => {
      const element = mockElement({}, 'Click me')
      const selectors = engine.generateSelectors(element)

      const textSelector = selectors.find(s => s.type === 'text')
      expect(textSelector).toBeDefined()
      expect(textSelector!.selector).toBe('text=Click me')
    })

    test('should skip text selectors for long text', () => {
      const longText = 'This is a very long text content that exceeds the 50 character limit for text selectors'
      const element = mockElement({}, longText)
      const selectors = engine.generateSelectors(element)

      const textSelector = selectors.find(s => s.type === 'text')
      expect(textSelector).toBeUndefined()
    })

    test('should always include XPath selector as fallback', () => {
      const element = mockElement({})
      const selectors = engine.generateSelectors(element)

      const xpathSelector = selectors.find(s => s.type === 'xpath')
      expect(xpathSelector).toBeDefined()
      expect(xpathSelector!.isUnique).toBe(true)
    })

    test('should sort selectors by score descending', () => {
      const element = mockElement({ 
        id: 'test-id', 
        'data-testid': 'test-data', 
        class: 'btn' 
      })
      const selectors = engine.generateSelectors(element)

      for (let i = 0; i < selectors.length - 1; i++) {
        expect(selectors[i].score).toBeGreaterThanOrEqual(selectors[i + 1].score)
      }
    })
  })

  describe('scoreSelector', () => {
    test('should score ID selectors highest', () => {
      const score = engine.scoreSelector('#test-id', 'id', true)
      expect(score).toBe(130)
    })

    test('should score data-testid selectors high', () => {
      const score = engine.scoreSelector('[data-testid="test"]', 'data-testid', true)
      expect(score).toBe(120)
    })

    test('should score XPath selectors low', () => {
      const score = engine.scoreSelector('//div[1]', 'xpath', true)
      expect(score).toBe(50)
    })
  })

  describe('rankSelectors', () => {
    test('should choose highest scoring selector', () => {
      const candidates: SelectorCandidate[] = [
        { selector: '.btn', type: 'css', score: 60, isUnique: false },
        { selector: '#submit', type: 'id', score: 130, isUnique: true },
        { selector: 'text=Submit', type: 'text', score: 50, isUnique: false }
      ]

      const result = engine.rankSelectors(candidates)

      expect(result.chosenSelector.type).toBe('id')
      expect(result.chosenSelector.selector).toBe('#submit')
      expect(result.reliabilityScore).toBe(100)
      expect(result.fallbackSelectors).toHaveLength(2)
    })

    test('should calculate reliability score correctly', () => {
      const candidates: SelectorCandidate[] = [
        { selector: '.btn', type: 'css', score: 60, isUnique: false }
      ]

      const result = engine.rankSelectors(candidates)

      expect(result.reliabilityScore).toBe(60)
    })

    test('should throw error for empty candidates', () => {
      expect(() => engine.rankSelectors([])).toThrow('No selector candidates provided')
    })

    test('should order fallback selectors by score', () => {
      const candidates: SelectorCandidate[] = [
        { selector: '.low', type: 'css', score: 30, isUnique: false },
        { selector: '#high', type: 'id', score: 130, isUnique: true },
        { selector: '.medium', type: 'css', score: 60, isUnique: false }
      ]

      const result = engine.rankSelectors(candidates)

      expect(result.fallbackSelectors[0].score).toBe(60)
      expect(result.fallbackSelectors[1].score).toBe(30)
    })
  })
})
