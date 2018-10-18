/**
 * This module defines end to end tests for the application.
 */

const { assert } = require('chai')
const Kafka = require('no-kafka')
const axios = require('axios')
const config = require('config')
const {
  invalidSchemaMessage,
  filteredOutMessage,
  generateMarathonMatchMessage,
  generateDevelopmentMessage,
  badCidMessage
} = require('./mockData')
const { sleep } = require('./helper')
const { logger } = require('../../src/common/logger')

// ensure environment variable NODE_ENV set to test
process.env.NODE_ENV = 'test'

describe('Marathon Match Processor Tests', function () {
  // disable `before hook` timeout
  // time to run `before hook` depends on kafka producer and consumer connection times
  this.timeout(0)
  let producer
  const debugLogs = []
  const errorLogs = []
  const error = logger.error
  const debug = logger.debug
  before(async () => {
    // inject logger with log collector
    logger.debug = (message) => {
      debugLogs.push(message)
      if (config.LOGGING_ON) {
        debug(message)
      }
    }
    logger.error = (message) => {
      errorLogs.push(message)
      if (config.LOGGING_ON) {
        error(message)
      }
    }
    // start the application (kafka listener)
    require('../../src/app')
    // setup kafka producer
    const options = {}
    if (config.KAFKA.CONNECTION_STRING) {
      options.connectionString = config.KAFKA.CONNECTION_STRING
    }
    if (config.KAFKA.SSL && config.KAFKA.SSL.CERT && config.KAFKA.SSL.KEY) {
      options.ssl = {
        cert: config.KAFKA.SSL.CERT,
        key: config.KAFKA.SSL.KEY
      }
    }
    producer = new Kafka.Producer(options)
    // start kafka producer
    await producer.init()
  })
  beforeEach(() => {
    // clear logs
    debugLogs.length = 0
    errorLogs.length = 0
  })
  after(async () => {
    // restore logger
    logger.error = error
    logger.debug = debug
    // try to end producer and consumer connections
    try {
      let listener = require('../../src/listener')
      listener.end()
      producer.end()
    } catch (err) {}
  })
  it('Should setup healthcheck with check on kafka connection', async () => {
    var connected = false
    const healthcheckEndpoint = `http://localhost:${process.env.PORT || 3000}/health`
    for (let i = 0; i < 10; i++) {
      try {
        let result = await axios.get(healthcheckEndpoint)
        if (result.status === 200) {
          connected = true
          break
        }
      } catch (err) {
        // if debugging, log error
      }
      await sleep(1000)
    }
    if (!connected) {
      console.log('failed to verify kafka connection - the rest of the e2e tests will likely fail')
    }
    assert(connected, 'healthcheck endpoint setup')
  })
  it('Should properly handle messages with invalid schemas', async () => {
    await producer.send(invalidSchemaMessage)
    await sleep(config.SLEEP_TIME)
    let found = errorLogs.find((message) => {
      return message.startsWith('ValidationError')
    })
    assert.isDefined(found, 'messages with invalid schema handled properly')
  })
  it('Should properly handle filtered out messages', async () => {
    await producer.send(filteredOutMessage)
    await sleep(config.SLEEP_TIME)
    let found = debugLogs.find((message) => {
      return message.startsWith('Filtered Out Message')
    })
    assert.isDefined(found, 'handle filtered out messages')
  })
  it('Should properly handle `MARATHON_MATCH` challenge messages', async () => {
    await producer.send(await generateMarathonMatchMessage())
    await sleep(config.SLEEP_TIME)
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })
  it('Should properly handle non-`MARATHON_MATCH` challenge messages', async () => {
    await producer.send(await generateDevelopmentMessage())
    await sleep(config.SLEEP_TIME)
    let found = debugLogs.find((message) => {
      return message.startsWith('Ignore')
    })
    assert.isDefined(found, 'handle non-`MARATHON_MATCH` challenge messages')
  })
  it('Should properly handle challenge details api errors', async () => {
    await producer.send(badCidMessage)
    await sleep(config.SLEEP_TIME)
    let found = errorLogs.find((message) => {
      return message.startsWith('Challenge Details API Error')
    })
    assert.isDefined(found, 'handle challenge details api errors')
  })
})
