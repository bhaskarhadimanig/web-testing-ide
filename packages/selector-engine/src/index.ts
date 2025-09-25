import { SelectorCandidate } from '@web-testing-ide/common'

export class SelectorEngine {
  generateSelectors(element: Element): SelectorCandidate[] {
    throw new Error('Not implemented yet - Phase 2')
  }

  scoreSelector(selector: string, element: Element): number {
    throw new Error('Not implemented yet - Phase 2')
  }
}
