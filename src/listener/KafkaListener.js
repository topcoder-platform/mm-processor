/**
 * This module defines the KafkaListener class.
 */

const Kafka = require('no-kafka')
const { processMessage } = require('../services/processorServices')
const { logger } = require('../common/logger')

/**
 * Class wrapping a kafka group consumer.
 */
class KafkaListener {
  /**
   * Create a wrapped consumer.
   * @param {string} connectionString - The kafka broker connection string.
   * @param {string} groupId - The kafka consumer group id.
   * @param {number} handlerConcurrency - The concurrency limit for message handlers
   * @param {Object} ssl - The ssl configuration.
   * @param {string} ssl.cert - The ssl certificate.
   * @param {string} ssl.key - The ssl key.
   */
  constructor (connectionString, groupId, handlerConcurrency, ssl) {
    let options = {}
    if (connectionString) {
      options.connectionString = connectionString
    }
    if (groupId) {
      options.groupId = groupId
    }
    if (Number.isInteger(handlerConcurrency) && handlerConcurrency >= 1) {
      options.handlerConcurrency = handlerConcurrency
    }
    if (ssl && ssl.cert && ssl.key) { // only set ssl option if both cert and key properties present
      options.ssl = ssl
    }
    this.consumer = new Kafka.GroupConsumer(options)
    this.topics = []
  }

  /**
   * Add topic for kafka consumer to listen to.
   * @param {string} topic - The topic to listen to.
   */
  addTopic (topic) {
    if (!this.topics.includes(topic)) {
      this.topics.push(topic)
    }
  }

  /**
   * Bootstrap the listener.
   */
  async bootstrap () {
    await this.consumer.init([{
      subscriptions: this.topics,
      handler: this.generateDataHandler()
    }])
  }

  /**
   * Generate data handler for messages from kafka.
   * @returns {function} The data handler.
   */
  generateDataHandler () {
    // expose the consumer through closure to the data handler
    // data handler will not be able to see `this` when invoked by `require('no-kafka')`
    const consumer = this.consumer
    /**
     * The data handler for kafka messags.
     * @param {Object[]} messageSet - The message set received from kafka.
     * @param {Object} messageSet[] - The message object received from kafka.
     * @param {Object} messageSet[].offset - The offset of the message.
     * @param {Object} messageSet[].message - The message property of the message object received from kafka.
     * @param {Object} messageSet[].message.value - The value property of the message property.
     * @param {string} topic - The topic for this message set.
     * @param {string} partition - The partition for this message set.
     */
    return async (messageSet, topic, partition) => {
      await Promise.each(messageSet, async function (m) {
        try { // attempt to process the message
          await processMessage(JSON.parse(m.message.value.toString('utf8')))
        } catch (err) {
          if (err instanceof SyntaxError) { // catch json parsing errors of message
            logger.error('Message with invalid json received from kafka')
          } else { // otherwise pass error to logger
            logger.logFullError(err)
          }
        } finally { // commit the message regardless of errors
          consumer.commitOffset({ topic, partition, offset: m.offset })
        }
      })
    }
  }

  generateIsConnected () {
    const consumer = this.consumer
    return () => {
      if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
        return false
      }
      let connected = true
      consumer.client.initialBrokers.forEach(conn => {
        logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
        connected = conn.connected & connected
      })
      return connected
    }
  }
}

module.exports = KafkaListener
