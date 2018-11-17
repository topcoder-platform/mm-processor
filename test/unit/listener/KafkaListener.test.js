/**
 * This module defines unit tests for the KafkaListener class.
 */

const proxyquire = require('proxyquire').noCallThru()
const { assert } = require('chai')
const sinon = require('sinon')
const { logger } = require('../../../src/common/logger')
const { kafkaOptions, messageSet, badMessageSet, topic, partition } = require('./mockData')

// mocked dependencies
class MockGroupConsumer {
  constructor (options) {
    this.options = options
    this.client = {}
  }
}
MockGroupConsumer.prototype.init = sinon.stub()
MockGroupConsumer.prototype.commitOffset = sinon.stub()
const processMessageStub = sinon.stub()
const errorLogs = []
const loggerStub = logger
loggerStub.error = (message) => {
  errorLogs.push(message)
}
loggerStub.logFullError = sinon.stub()

describe('The KafkaListener class', () => {
  // declaration of unit under test
  let KafkaListener
  before(() => {})
  beforeEach(() => {
    // restore mocked dependencies to initial state
    MockGroupConsumer.prototype.init.reset()
    MockGroupConsumer.prototype.commitOffset.reset()
    processMessageStub.reset()
    loggerStub.logFullError.reset()
    errorLogs.length = 0
    // initialize unit under test
    KafkaListener = proxyquire('../../../src/listener/KafkaListener', {
      'no-kafka': {
        GroupConsumer: MockGroupConsumer
      },
      '../services/processorServices': {
        processMessage: processMessageStub
      },
      '../common/logger': {
        logger: loggerStub
      }
    })
  })
  describe('The constructor', () => {
    it('Should appropriately set consumer property to instance of GroupConsumer', () => {
      let kafkaListener = new KafkaListener(
        kafkaOptions.connectionString,
        kafkaOptions.groupId,
        kafkaOptions.handlerConcurrency,
        kafkaOptions.ssl
      )
      assert.deepEqual(kafkaListener.consumer.options, kafkaOptions)
    })
    it('Should only set ssl option if both cert and key are present', () => {
      let kafkaListener = new KafkaListener(null, null, null, { cert: kafkaOptions.ssl.cert })
      assert.notProperty(kafkaListener.consumer.options, 'ssl')
    })
    it('Should only set handler concurrency option if it is a positive integer', () => {
      let kafkaListener = new KafkaListener(null, null, -1, null)
      assert.notProperty(kafkaListener.consumer.options, 'handlerConcurrency')
    })
    it('Should initialize topics property', () => {
      let kafkaListener = new KafkaListener()
      assert.isArray(kafkaListener.topics)
      assert.isEmpty(kafkaListener.topics)
    })
  })
  describe('The addTopic method', () => {
    it('Should push topic onto topics property if not alread there', () => {
      let kafkaListener = new KafkaListener()
      kafkaListener.addTopic(topic)
      assert.include(kafkaListener.topics, topic)
      kafkaListener.addTopic(topic)
      assert.lengthOf(kafkaListener.topics, 1)
    })
  })
  describe('The bootstrap method', () => {
    it('Should initialize consumer with added topics', async () => {
      let kafkaListener = new KafkaListener()
      kafkaListener.addTopic(topic)
      let dataHandler = kafkaListener.generateDataHandler()
      sinon.stub(kafkaListener, 'generateDataHandler').returns(dataHandler)
      await kafkaListener.bootstrap()
      assert(kafkaListener.consumer.init.calledOnceWithExactly([{
        subscriptions: kafkaListener.topics,
        handler: dataHandler
      }]), 'initialized consumer with added topics')
    })
  })
  describe('The data handler method', async () => {
    it('Should pass each received message to the message processor service', async () => {
      let kafkaListener = new KafkaListener()
      kafkaListener.addTopic(topic)
      let dataHandler = kafkaListener.generateDataHandler()
      await dataHandler(messageSet)
      for (let m of messageSet) {
        assert(
          processMessageStub.calledWithExactly(
            JSON.parse(m.message.value.toString('utf8'))
          ),
          'each received message passed to message processor'
        )
      }
    })
    it('Should log json parsing errors due to invalid json messages received from kafka', async () => {
      let kafkaListener = new KafkaListener()
      let dataHandler = kafkaListener.generateDataHandler()
      await dataHandler(badMessageSet)
      assert.include(errorLogs, 'Message with invalid json received from kafka')
    })
    it('Should pass all other errors (besides json parsing errors) to logFullError method of logger', async () => {
      let kafkaListener = new KafkaListener()
      let dataHandler = kafkaListener.generateDataHandler()
      let error = new Error('non json parsing error')
      processMessageStub.throws(error)
      await dataHandler(messageSet.slice(0, 1))
      assert(loggerStub.logFullError.calledOnceWithExactly(error), 'log full error for non json parsing errors')
    })
    it('Should commit each message regardless of json parsing errors', async () => {
      let kafkaListener = new KafkaListener()
      let fullMessageSet = messageSet.concat(badMessageSet)
      let dataHandler = kafkaListener.generateDataHandler()
      await dataHandler(fullMessageSet, topic, partition)
      for (let m of fullMessageSet) {
        assert(
          kafkaListener.consumer.commitOffset.calledWithExactly({ topic, partition, offset: m.offset }),
          'commit each message regardless of json parsing errors'
        )
      }
    })
  })
  describe('The isConnected method', () => {
    it('Should return true when connection to broker is up', async () => {
      let kafkaListener = new KafkaListener()
      kafkaListener.consumer.client.initialBrokers = [{
        server: () => {
          return 'kafka-broker-url'
        },
        connected: true
      }]
      assert((kafkaListener.generateIsConnected())(), 'isConnected returns true when connected')
    })
    it('Should return false when connection to broker is down', async () => {
      let kafkaListener = new KafkaListener()
      kafkaListener.consumer.client.initialBrokers = [{
        server: () => {
          return 'kafka-broker-url'
        },
        connected: false
      }]
      assert(!(kafkaListener.generateIsConnected())(), 'isConnected returns true when connected')
    })
  })
})
