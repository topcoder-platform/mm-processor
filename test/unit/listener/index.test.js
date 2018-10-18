/**
 * This module defines unit tests for the proper creation of a KafkaListener instance for the application.
 */

const proxyquire = require('proxyquire').noCallThru()
const { assert } = require('chai')

// mock dependencies
class MockKafkaListener {
  constructor (connectionString, groupId, handlerConcurrency, ssl) {
    // collect constructor arguments for testing
    this.constructorArgs = {
      connectionString,
      groupId,
      handlerConcurrency,
      ssl
    }
    this.topics = []
  }

  addTopic (topic) {
    this.topics.push(topic)
  }
}

const configStub = {
  KAFKA: {
    CONNECTION_STRING: 'connection string',
    GROUP_ID: 'group id',
    HANDLER_CONCURRENCY: 'handler concurrency',
    SSL: { CERT: 'ssl cert', KEY: 'ssl key' },
    TOPIC: 'test.topic'
  }
}

describe('The kafka listener instance', () => {
  // the unit under test
  let listener
  beforeEach(() => {
    // initialize the unit under test
    listener = proxyquire('../../../src/listener', {
      './KafkaListener': MockKafkaListener,
      'config': configStub
    })
  })
  it('Is appropriately constructed from configuration variables', () => {
    assert.equal(
      listener.constructorArgs.connectionString,
      configStub.KAFKA.CONNECTION_STRING,
      'constructor call used configured connection string'
    )
    assert.equal(
      listener.constructorArgs.groupId,
      configStub.KAFKA.GROUP_ID,
      'constructor call used configured group id'
    )
    assert.equal(
      listener.constructorArgs.handlerConcurrency,
      configStub.KAFKA.HANDLER_CONCURRENCY,
      'constructor call used configured handler concurrency'
    )
    assert.equal(
      listener.constructorArgs.ssl,
      configStub.KAFKA.SSL,
      'constructor call used configured ssl variables'
    )
  })
  it('Adds configured topics to listen to with filters', () => {
    assert.include(listener.topics, configStub.KAFKA.TOPIC)
  })
})
