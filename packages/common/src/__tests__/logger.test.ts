import { Logger, LogLevel } from '../utils/logger'

describe('Logger', () => {
  let logger: Logger
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    logger = new Logger()
    consoleSpy = jest.spyOn(console, 'info').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  test('should log info messages by default', () => {
    logger.info('test message')
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] test message')
  })

  test('should respect log level', () => {
    logger.setLevel(LogLevel.ERROR)
    logger.info('test message')
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
