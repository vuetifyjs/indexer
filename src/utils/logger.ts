import consola from 'consola'

// Create a custom logger instance
export const logger = consola.create({
  // You can customize the logger here
  // For example, add custom reporters or tags
  defaults: {
    tag: 'indexer'
  }
})

// Type the logger functions
type LoggerFn = (message: string, ...args: unknown[]) => void

// Export commonly used log levels
export const log: LoggerFn = (message, ...args) => logger.log(message, ...args)
export const info: LoggerFn = (message, ...args) => logger.info(message, ...args)
export const success: LoggerFn = (message, ...args) => logger.success(message, ...args)
export const warn: LoggerFn = (message, ...args) => logger.warn(message, ...args)
export const error: LoggerFn = (message, ...args) => logger.error(message, ...args)
export const debug: LoggerFn = (message, ...args) => logger.debug(message, ...args)
