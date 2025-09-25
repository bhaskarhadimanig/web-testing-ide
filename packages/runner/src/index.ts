import { RecordingSession, TestRun } from '@web-testing-ide/common'

export class TestRunner {
  async runTest(session: RecordingSession): Promise<TestRun> {
    throw new Error('Not implemented yet - Phase 3')
  }

  async runAllTests(): Promise<TestRun[]> {
    throw new Error('Not implemented yet - Phase 3')
  }
}
