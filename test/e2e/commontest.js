const config = require('config')
const { assert } = require('chai')
const fs = require('fs')
const path = require('path')
const {
  generateMarathonMatchMessage,
  generateVerificationMessageItem
} = require('./mockData')
module.exports = (lag, producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub) => {
  const s3Url = config[`${lag.toUpperCase()}_S3_URL`]
  const fileType = lag === 'csharp' ? 'cs' : lag
  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid className for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.className = 'invalidClass'
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let errorFound = errorLogs.find((message) => {
      return message.startsWith(`The class ${verificationItem.className} cannot be found`)
    })
    assert.isDefined(errorFound, 'should throw error if class name is invalid')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid methodName for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.methods[0].name = 'invalidMethod'
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let errorFound = errorLogs.find((message) => {
      return message.startsWith(`The match public method ${verificationItem.methods[0].name} in class ${verificationItem.className} cannot be found`)
    })
    assert.isDefined(errorFound, 'should throw error if method name is invalid')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid input type for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.methods[0].input = ['invalidInputType']
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let errorFound = errorLogs.find((message) => {
      return message.startsWith(`input value type <${verificationItem.methods[0].input[0]}> is not accepted`)
    })
    assert.isDefined(errorFound, 'should throw error if input type is invalid')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid output type for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.methods[0].name = 'testArrayOfInt'
    verificationItem.methods[0].input = ['int[]']
    verificationItem.methods[0].output = 'invalidOutput'
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let errorFound = errorLogs.find((message) => {
      return message.startsWith(`output value type <${verificationItem.methods[0].output}> is not accepted`)
    })
    assert.isDefined(errorFound, 'should throw error if method name is invalid')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with private method name for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.methods[0].name = 'privateMethod'
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let errorFound = errorLogs.find((message) => {
      return message.startsWith(`The match public method ${verificationItem.methods[0].name} in class ${verificationItem.className} cannot be found`)
    })
    assert.isDefined(errorFound, 'should throw error if method name is invalid')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with void method name for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    const verificationItem = generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)
    verificationItem.methods[0].name = 'voidMethod'
    verificationItem.methods[0].output = 'void'
    let verification = {
      Count: 1,
      Items: [verificationItem]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.equal(errorLogs.length, 0, 'should have no errors')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid verification count for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    docScanStub.resolves({
      Count: 0
    })
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    await producer.send(message)
    await waitJob()
    const payload = JSON.parse(message.message.value).payload
    assert.isTrue(docPutStub.called)

    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    const challengeId = String(payload.challengeId)
    // check data
    assert.deepEqual(docPutStubParams, {
      TableName: config.AWS.JOB_TABLE_NAME,
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
      TableName: config.AWS.VERIFICATION_TABLE_NAME,
      FilterExpression: 'challengeId = :challengeId',
      ExpressionAttributeValues: { ':challengeId': challengeId },
      Select: 'ALL_ATTRIBUTES'
    })
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
    assert.isTrue(errorLogs.some(x => x.includes('The verification information cannot be found or multiple verifications are found')))
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with invalid s3 url for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    let foundInvalidS3Url = errorLogs.find((message) => {
      return message.includes('The URL is not for S3')
    })
    assert.isDefined(foundInvalidS3Url, 'should ignore invalid s3 url')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages and invalid method input for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
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
    if (lag === 'java') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    } else if (lag === 'csharp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/csharp/job', jobId, 'project/Verification.dll')))
    } else if (lag === 'cpp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/cpp/job', jobId)))
    }
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with valid verification for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
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
    if (lag === 'java') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    } else if (lag === 'csharp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/csharp/job', jobId, 'project/Verification.dll')))
    } else if (lag === 'cpp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/cpp/job', jobId)))
    }
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.property(r, 'score', 'should exist score property in each run code result')
      assert.property(r, 'executeTime', 'should exist executeTime property in each run code result')
      assert.property(r, 'memory', 'should exist memory property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with array of int method input for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testArrayOfInt'
    verification.Items[0].methods[0].input = ['int[]']
    verification.Items[0].inputs = [[[1]], [[2]], [[3]]]
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    if (lag === 'java') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    } else if (lag === 'csharp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/csharp/job', jobId, 'project/Verification.dll')))
    } else if (lag === 'cpp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/cpp/job', jobId)))
    }
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      // could invoke methods with param in verification.js rightly
      assert.property(r, 'score', 'should exist score property in each run code result')
      assert.property(r, 'memory', 'should exist memory property in each run code result')
      assert.property(r, 'executeTime', 'should exist executeTime property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })

  it(`Should properly handle \`MARATHON_MATCH\` challenge messages with error in verification.js for ${lag}`, async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(fileType, s3Url)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testError'
    verification.Items[0].inputs = [[]] // c++ will verify inputs too
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    if (lag === 'java') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/java/job', jobId, 'project/src/main/java')))
    } else if (lag === 'csharp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/csharp/job', jobId, 'project/Verification.dll')))
    } else if (lag === 'cpp') {
      assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/cpp/job', jobId)))
    }
    assert.isTrue(docUpdateStub.called)
    assert.isTrue(docScanStub.called)
    const lastReturn = await docUpdateStub.lastCall.returnValue
    assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
    const result = lastReturn.Attributes.results
    result.forEach(r => {
      assert.propertyVal(r, 'executeTime', -1, 'should equal -1 if error happens')
      assert.propertyVal(r, 'memory', -1, 'should equal -1 if error happens')
      assert.propertyVal(r, 'score', 0, 'should equal 0 if error happens')
      // will get real expected error message result.
      assert.match(r.error, /Error in method of verification/, 'should exist error property in each run code result')
    })
    let found = debugLogs.find((message) => {
      return message.startsWith('Successful Processing of MM Message')
    })
    assert.isDefined(found, 'handle `MARATHON_MATCH` challenge messages')
  })
}
