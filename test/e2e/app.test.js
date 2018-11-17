/**
 * This module defines end to end tests for the application.
 */
global.Promise = require('bluebird')
const { assert } = require('chai')
const Kafka = require('no-kafka')
const axios = require('axios')
const config = require('config')
const sinon = require('sinon')
const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk-mock')
const glob = require('glob')

const {
  invalidSchemaMessage,
  filteredOutMessage,
  generateMarathonMatchMessage,
  generateDevelopmentMessage,
  badCidMessage
} = require('./mockData')

const { sleep, parseS3Url } = require('./helper')
const { logger } = require('../../src/common/logger')

const docPutStub = sinon.stub().resolves(null)
const docUpdateStub = sinon.stub()
const docScanStub = sinon.stub()
const s3GetStub = sinon.stub()

docUpdateStub.withArgs(sinon.match.has('ExpressionAttributeValues', sinon.match.has(':status', 'Finished')))
  .callsFake(async (params) => {
    return {
      Attributes: {
        status: 'Finished',
        results: params.ExpressionAttributeValues[':results']
      }
    }
  })
docUpdateStub.withArgs(sinon.match.has('ExpressionAttributeValues', sinon.match.has(':status', 'Verification'))).resolves(null)
docUpdateStub.withArgs(sinon.match.has('ExpressionAttributeValues', sinon.match.has(':status', 'Compile'))).resolves(null)
docUpdateStub.withArgs(sinon.match.has('ExpressionAttributeValues', sinon.match.has(':status', 'Error'))).callsFake(async (params) => {
  return {
    Attributes: {
      status: 'Error',
      error: params.ExpressionAttributeValues[':error']
    }
  }
})

for (let fileType of ['java', 'cpp', 'csharp']) {
  const [bucket, key] = parseS3Url(config[`${fileType.toUpperCase()}_S3_URL`])
  s3GetStub.withArgs({
    Bucket: bucket,
    Key: key
  }).resolves({
    Body: Buffer.from(fs.readFileSync(path.join(__dirname,
      `../../verifications/${fileType}test/GuessRandom.${fileType === 'csharp' ? 'cs' : fileType}`)))
  })
  const [verificationBucket, verificationKey] = parseS3Url(config.VERIFICATION_S3_URL[fileType])
  s3GetStub.withArgs({
    Bucket: verificationBucket,
    Key: verificationKey
  }).resolves({
    Body: Buffer.from(fs.readFileSync(path.join(__dirname, `../../verifications/${fileType}test/verification.js`)))
  })
}

// use files under verifications folder to generate match s3 file url
glob.sync('cpptest/*.{js,cpp}', {
  cwd: path.join(__dirname, '../../verifications')
}).forEach((matchFile) => {
  const [bucketName, key] = parseS3Url(`https://s3.amazonaws.com/tc-development-bucket/${matchFile}`)
  s3GetStub.withArgs({
    Bucket: bucketName,
    Key: key
  }).resolves({
    Body: Buffer.from(fs.readFileSync(path.join(__dirname, '../../verifications', matchFile)))
  })
})
AWS.mock('DynamoDB.DocumentClient', 'put', docPutStub)
AWS.mock('DynamoDB.DocumentClient', 'update', docUpdateStub)
AWS.mock('DynamoDB.DocumentClient', 'scan', docScanStub)
AWS.mock('S3', 'getObject', s3GetStub)

// ensure environment variable NODE_ENV set to test
process.env.NODE_ENV = 'test'

describe('Marathon Match Processor Tests', function () {
  // disable `before hook` timeout
  // time to run `before hook` depends on kafka producer and consumer connection times
  this.timeout(0)
  let listener
  const debugLogs = []
  const errorLogs = []
  const error = logger.error
  const debug = logger.debug
  let options = {}
  if (config.KAFKA.CONNECTION_STRING) {
    options.connectionString = config.KAFKA.CONNECTION_STRING
  }
  if (config.KAFKA.GROUP_ID) {
    options.groupId = config.KAFKA.GROUP_ID
  }
  if (Number.isInteger(config.KAFKA.HANDLER_CONCURRENCY) && config.KAFKA.HANDLER_CONCURRENCY >= 1) {
    options.handlerConcurrency = config.KAFKA.HANDLER_CONCURRENCY
  }
  if (config.KAFKA.SSL && config.KAFKA.SSL.CERT && config.KAFKA.SSL.KEY) {
    options.ssl = {
      cert: config.KAFKA.SSL.CERT,
      key: config.KAFKA.SSL.KEY
    }
  }
  let producer = new Kafka.Producer(options)
  const waitJob = async () => {
    let count = 0
    while (true) {
      if (count > config.MAX_CHECKS) {
        console.error(`break check with max times ${config.MAX_CHECKS}`)
        break
      }
      if (docUpdateStub.args.length && docUpdateStub.args.find(x => {
        let status = x[0]['ExpressionAttributeValues'][':status']
        return status === 'Error' || status === 'Finished'
      })) {
        break
      }
      if (errorLogs.length > 0) {
        break
      }
      await sleep(config.SLEEP_TIME)
      count++
    }
  }
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
    // start kafka producer
    await producer.init()
    // remove all not processed messages
    const consumer = new Kafka.GroupConsumer(options)
    await consumer.init([{
      subscriptions: [config.KAFKA.TOPIC],
      handler: (messageSet, topic, partition) =>
        Promise.each(messageSet, (m) =>
          consumer.commitOffset({ topic: topic, partition: partition, offset: m.offset }))
    }])
    await sleep(2000)
    await consumer.end()
    // start the application (kafka listener)
    listener = require('../../src/app')
  })
  beforeEach(async () => {
    // clear logs
    debugLogs.length = 0
    errorLogs.length = 0
    docScanStub.reset()
    docUpdateStub.resetHistory()
    docPutStub.resetHistory()
    s3GetStub.resetHistory()
  })
  after(async () => {
    // restore logger
    logger.error = error
    logger.debug = debug
    try {
      await producer.end()
    } catch (err) {
      // ignore
    }
    try {
      await listener.end()
    } catch (err) {
      // ignore
    }
  })

  it('Should setup healthcheck with check on kafka connection', async () => {
    let connected = false
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
    await waitJob()
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
    await waitJob()
    let found = errorLogs.find((message) => {
      return message.startsWith('Challenge Details API Error')
    })
    assert.isDefined(found, 'handle challenge details api errors')
  })

  describe('Marathon Match Processor Common Tests', () => {
    for (let fileType of ['java', 'cpp', 'csharp']) {
      require('./commontest')(fileType, producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub)
    }
  })

  describe('Marathon Match Java Code Processor Tests', () => {
    require('./javacodetest')(producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub)
  })

  describe('Marathon Match C# Code Processor Tests', () => {
    require('./csharpcodetest')(producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub)
  })

  describe('Marathon Match C++ Code Processor Tests', () => {
    require('./cppcodetest')(producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub)
  })
})
