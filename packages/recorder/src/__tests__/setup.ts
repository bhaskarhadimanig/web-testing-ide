import '@testing-library/jest-dom'

jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn(),
          screenshot: jest.fn(),
          evaluate: jest.fn().mockResolvedValue('Mozilla/5.0 (test)'),
          on: jest.fn(),
          url: jest.fn().mockReturnValue('https://demo.playwright.dev'),
          mainFrame: jest.fn().mockReturnValue({
            url: jest.fn().mockReturnValue('https://demo.playwright.dev')
          })
        })
      }),
      close: jest.fn()
    })
  }
}));

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDefined(): R;
      toBeInstanceOf(expected: any): R;
      toHaveProperty(property: string): R;
    }
  }
}

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
