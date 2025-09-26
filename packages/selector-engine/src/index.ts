import { SelectorCandidate, SelectorResult } from '@web-testing-ide/common'

export class SelectorEngine {
  private readonly SCORING_WEIGHTS = {
    id: 100,
    'data-testid': 90,
    name: 85,
    'aria-label': 80,
    css: 60,
    text: 50,
    xpath: 30
  }

  private readonly UNIQUENESS_BONUS = 20
  private readonly STABILITY_BONUS = 10

  generateSelectors(element: Element): SelectorCandidate[] {
    const candidates: SelectorCandidate[] = []

    if (element.id) {
      candidates.push({
        selector: `#${element.id}`,
        type: 'id',
        score: this.calculateScore('id', true, true),
        isUnique: true
      })
    }

    const testId = element.getAttribute('data-testid')
    if (testId) {
      candidates.push({
        selector: `[data-testid="${testId}"]`,
        type: 'data-testid',
        score: this.calculateScore('data-testid', true, true),
        isUnique: true
      })
    }

    const name = element.getAttribute('name')
    if (name) {
      candidates.push({
        selector: `[name="${name}"]`,
        type: 'name',
        score: this.calculateScore('name', false, true),
        isUnique: false
      })
    }

    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) {
      candidates.push({
        selector: `[aria-label="${ariaLabel}"]`,
        type: 'aria-label',
        score: this.calculateScore('aria-label', false, true),
        isUnique: false
      })
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim())
      if (classes.length > 0) {
        const cssSelector = `.${classes.join('.')}`
        candidates.push({
          selector: cssSelector,
          type: 'css',
          score: this.calculateScore('css', false, false),
          isUnique: false
        })
      }
    }

    const textContent = element.textContent?.trim()
    if (textContent && textContent.length < 50) {
      candidates.push({
        selector: `text=${textContent}`,
        type: 'text',
        score: this.calculateScore('text', false, false),
        isUnique: false
      })
    }

    const xpath = this.generateAdvancedXPath(element)
    candidates.push({
      selector: xpath,
      type: 'xpath',
      score: this.calculateScore('xpath', true, false),
      isUnique: true
    })

    return candidates.sort((a, b) => b.score - a.score)
  }

  scoreSelector(selector: string, type: SelectorCandidate['type'], isUnique: boolean = false): number {
    const isStable = type === 'id' || type === 'data-testid'
    return this.calculateScore(type, isUnique, isStable)
  }

  rankSelectors(candidates: SelectorCandidate[]): SelectorResult {
    if (candidates.length === 0) {
      throw new Error('No selector candidates provided')
    }

    const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score)
    const chosenSelector = sortedCandidates[0]
    const fallbackSelectors = sortedCandidates.slice(1)

    const reliabilityScore = Math.min(100, chosenSelector.score + (chosenSelector.isUnique ? 20 : 0))

    return {
      chosenSelector,
      reliabilityScore,
      fallbackSelectors
    }
  }

  private calculateScore(type: SelectorCandidate['type'], isUnique: boolean, isStable: boolean): number {
    let score = this.SCORING_WEIGHTS[type] || 0
    
    if (isUnique) {
      score += this.UNIQUENESS_BONUS
    }
    
    if (isStable) {
      score += this.STABILITY_BONUS
    }

    return score
  }

  private generateXPath(element: Element): string {
    return this.generateAdvancedXPath(element)
  }

  private generateAdvancedXPath(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`
    }

    const tagName = element.tagName.toLowerCase()
    const parent = element.parentElement

    if (!parent || parent.tagName === 'HTML') {
      return `/${tagName}`
    }

    const type = element.getAttribute('type')
    const name = element.getAttribute('name')
    const className = element.getAttribute('class')
    const role = element.getAttribute('role')

    if (name) {
      const nameXPath = `${this.generateAdvancedXPath(parent)}/${tagName}[@name="${name}"]`
      return nameXPath
    }

    if (type) {
      const typeXPath = `${this.generateAdvancedXPath(parent)}/${tagName}[@type="${type}"]`
      return typeXPath
    }

    if (role) {
      const roleXPath = `${this.generateAdvancedXPath(parent)}/${tagName}[@role="${role}"]`
      return roleXPath
    }

    const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName)
    const index = siblings.indexOf(element) + 1

    if (siblings.length === 1) {
      return `${this.generateAdvancedXPath(parent)}/${tagName}`
    } else {
      return `${this.generateAdvancedXPath(parent)}/${tagName}[${index}]`
    }
  }
}
