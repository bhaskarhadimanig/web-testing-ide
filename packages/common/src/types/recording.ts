export interface RecorderStep {
  id: string
  type: 'click' | 'doubleClick' | 'type' | 'navigate' | 'select' | 'upload' | 'download' | 'drag' | 'wait' | 'screenshot' | 'assertion'
  timestamp: number
  url: string
  viewport: { width: number; height: number }
  frameUrl?: string
  selectors: SelectorCandidate[]
  value?: string | number | boolean
  screenshot?: string
  metadata: StepMetadata
  assertion?: AssertionData
}

export interface AssertionData {
  type: 'exists' | 'visible' | 'containsText' | 'urlContains'
  expectedValue?: string
  description?: string
}

export interface SelectorCandidate {
  selector: string
  type: 'id' | 'data-testid' | 'css' | 'xpath' | 'text' | 'aria-label'
  score: number
  isUnique: boolean
}

export interface SelectorResult {
  chosenSelector: SelectorCandidate
  reliabilityScore: number
  fallbackSelectors: SelectorCandidate[]
}

export interface CodegenOptions {
  framework: 'playwright' | 'cypress' | 'selenium'
  language: 'typescript' | 'javascript' | 'python' | 'java'
  defaultTimeoutMs?: number
  retryAttempts?: number
  autoWait?: boolean
}

export interface StepMetadata {
  elementAttributes?: Record<string, string>
  boundingBox?: { x: number; y: number; width: number; height: number }
  innerText?: string
  tagName?: string
}

export interface RecordingSession {
  id: string
  name: string
  url: string
  createdAt: number
  updatedAt: number
  steps: RecorderStep[]
  viewport: { width: number; height: number }
  userAgent: string
  metadata: SessionMetadata
}

export interface SessionMetadata {
  description?: string
  tags?: string[]
  duration?: number
  totalSteps?: number
}

export interface TestRun {
  id: string
  sessionId: string
  status: 'running' | 'passed' | 'failed' | 'cancelled'
  startedAt: number
  completedAt?: number
  artifacts: TestArtifact[]
  errors?: TestError[]
}

export interface TestArtifact {
  type: 'screenshot' | 'trace' | 'video' | 'log'
  path: string
  stepId?: string
}

export interface TestError {
  stepId: string
  message: string
  stack?: string
  screenshot?: string
}
