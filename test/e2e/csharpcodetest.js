const config = require('config')
const { assert } = require('chai')
const fs = require('fs')
const path = require('path')
const {
  generateMarathonMatchMessage,
  generateVerificationMessageItem
} = require('./mockData')
module.exports = (producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub) => {
  it('Should properly handle `MARATHON_MATCH` challenge messages with C# code type and execute time/memory', async () => {
    assert.isFalse(docPutStub.called)
    assert.isFalse(docUpdateStub.called)
    assert.isFalse(docScanStub.called)
    const message = await generateMarathonMatchMessage(config.SUPPORTED_FILE_TYPES.CSHARP, config.CSHARP_S3_URL)
    const payload = JSON.parse(message.message.value).payload
    const challengeId = String(payload.challengeId)
    let verification = {
      Count: 1,
      Items: [generateVerificationMessageItem(challengeId, config.VERIFICATION_S3_URL)]
    }
    verification.Items[0].methods[0].name = 'testMemoryAndTime'
    docScanStub.resolves(verification)
    await producer.send(message)
    await waitJob()
    assert.isTrue(docPutStub.called)
    const docPutStubParams = docPutStub.args[0][0]
    const jobId = docPutStubParams.Item.id
    assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/csharp/job', jobId, 'project/Verification.dll')))
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
}
