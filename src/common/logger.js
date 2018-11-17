/**
 * This module defines a winston logger instance for the application.
 */

const winston = require('winston')

const config = require('config')

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.colorize({ level: true }),
    winston.format.printf((info) => { return `${new Date().toISOString()} - ${info.level}: ${info.message}` })
  ),
  transports: [
    new (winston.transports.Console)({
      level: config.LOG_LEVEL
    })
  ]
})

logger.logFullError = (err) => {
  if (err.isJoi) { // handle Joi validation errors
    logger.error(`${err.name}: ${err.details.map(detail => detail.message.replace(/"/g, '`')).join(', ')}`)
  } else if (err.stack) { // log error stack if present
    logger.error(err.stack)
  } else {
    logger.error(JSON.stringify(err))
  }
}

module.exports = {
  logger
}
