/**
 * This module creates a KafkaListener instance for the application.
 */

const KafkaListener = require('./KafkaListener')
const config = require('config')

// create listener instance
const listener = new KafkaListener(
  config.KAFKA.CONNECTION_STRING,
  config.KAFKA.GROUP_ID,
  config.KAFKA.HANDLER_CONCURRENCY,
  config.KAFKA.SSL
)

// add the configured topic to the kafka listener
listener.addTopic(config.KAFKA.TOPIC)

module.exports = listener
