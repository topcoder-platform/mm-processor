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

const {
  invalidSchemaMessage,
  filteredOutMessage,
  generateMarathonMatchMessage,
  generateMarathonMatchMessageWithJavaCode,
  generateDevelopmentMessage,
  generateVerificationMessageItem,
  badCidMessage
} = require('./mockData')

const { sleep, parseS3Url } = require('./helper')
const { logger } = require('../../src/common/logger')
const javaConfig = require('config').util.loadFileConfigs(path.join(__dirname, '../../src/java/config'))

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

const [javaBucket, javaKey] = parseS3Url(config.JAVA_S3_URL)
s3GetStub.withArgs({
  Bucket: javaBucket,
  Key: javaKey
}).resolves({
  Body: Buffer.from(fs.readFileSync(path.join(__dirname, '../../verifications/test/Random.java')))
})
const [verificationBucket, verificationKey] = parseS3Url(config.VERIFICATION_S3_URL)
s3GetStub.withArgs({
  Bucket: verificationBucket,
  Key: verificationKey
}).resolves({
  Body: Buffer.from(fs.readFileSync(path.join(__dirname, '../../verifications/test/verification.js')))
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
  let producer
  let options
  let listener
  const debugLogs = []
  const errorLogs = []
  const error = logger.error
  const debug = logger.debug
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
    options = {}
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
    producer = new Kafka.Producer(options)
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

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and invalid verification count', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    docScanStub.resolves({
      Count: 0
    })
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    await producer.send(message)
    await waitJob()
    const payload = JSON.parse(message.message.value).payload
    assert.isTrue(docPutStub.called)

    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    const challengeId = String(payload.challengeId)
    // check data
    assert.deepEqual(docPutStubParams, {
      TableName: javaConfig.AWS.JOB_TABLE_NAME,
      Item: {
        id: jobId,
        submissionId: payload.id,
        challengeId,
        memberId: String(payload.memberId),
        createdOn: docPutStubParams.Item.createdOn,
        updatedOn: docPutStubParams.Item.updatedOn,
        status: 'Start'
      }
    })
    // make sure job related folder are generated successfully
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    assert.deepEqual(docScanStub.args[0][0], {
      TableName: javaConfig.AWS.VERIFICATION_TABLE_NAME,
      FilterExpression: 'challengeId = :challengeId',
      ExpressionAttributeValues: { ':challengeId': challengeId },
      Select: 'ALL_ATTRIBUTES'
    })
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
    assert.include(errorLogs, 'The verification information cannot be found or multiple verifications are found', ' verification not found')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java code type and invalid s3 url', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode()
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await sleep(config.SLEEP_TIME)
    let foundInvalidS3Url = errorLogs.find((message) => {
      return message.startsWith('The URL is not for S3')
    })
    assert.isDefined(foundInvalidS3Url, 'should ignore invalid s3 url')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and valid verification', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'score', 'should exist score property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and invalid method name', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'notexist'
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and invalid method input', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].input = ['string']
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and array of int method input', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testArrayOfInt'
    verification.Items[0].methods[0].input = ['int[]']
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'executeTime', -1, 'should equal -1 if error happens')
      assert.property(r, 'memory', -1, 'should equal -1 if error happens')
      assert.property(r, 'score', 0, 'should equal 0 if error happens')
      assert.property(r, 'error', 'Error in verification', 'should exist error property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and error in verification.js', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testArrayOfString'
    verification.Items[0].methods[0].input = ['string[]']
    verification.Items[0].methods[0].output = 'int'
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'executeTime', -1, 'should equal -1 if error happens')
      assert.property(r, 'memory', -1, 'should equal -1 if error happens')
      assert.property(r, 'score', 0, 'should equal 0 if error happens')
      assert.property(r, 'error', 'Error in verification', 'should exist error property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and out of memory error', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].maxMemory = '6m'
    verification.Items[0].methods[0].name = 'testOOM'
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'executeTime', -1, 'should equal -1 if error happens')
      assert.property(r, 'memory', -1, 'should equal -1 if error happens')
      assert.property(r, 'score', 0, 'should equal 0 if error happens')
      assert.property(r, 'error', `OutOfMemoryError happened with max memory=${verification.Items[0].maxMemory}`, 'should exist score property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it('Should properly handle `MARATHON_MATCH` challenge messages with java codes type and execute time/memory', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessageWithJavaCode(config.JAVA_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testOOM'
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'score', 'should exist score property in each run code result')
      assert.property(r, 'memory', 'should exist memory property in each run code result')
      assert.property(r, 'executeTime', 'should exist executeTime property in each run code result')
      assert.isTrue(r.executeTime >= 1000) // usually >1000
      assert.isTrue(r.memory >= 1024 * 8)
    })
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
})
