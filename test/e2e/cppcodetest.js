const config = require('config')
const should = require('should')
const { assert } = require('chai')
const fs = require('fs')
const path = require('path')
const {
  generateMarathonMatchMessage,
  generateVerificationMessageItemWithCppCode,
  getChallengeId
} = require('./mockData')
const verificationUrl = 'https://s3.amazonaws.com/tc-development-bucket/cpptest/verification.js'
const cases = require(path.join(__dirname, '../../node_modules/cpp-mm-scoring/test_files/cases.json'))
const readTestFile = filename => fs.readFileSync(path.join(__dirname, '../../node_modules/cpp-mm-scoring/test_files', filename), 'utf-8')
module.exports = (producer, waitJob, debugLogs, errorLogs, docPutStub, docUpdateStub, docScanStub) => {
  describe('C++ Code Cases Tests', () => {
    cases.forEach((sample, index) => {
      const testIndex = index + 1
      const signature = JSON.parse(readTestFile(`case${testIndex}_signature.txt`))
      const inputData = JSON.parse(readTestFile(sample[1]))
      it(`should run Test case ${testIndex} ${sample[2]} without error`, async () => {
        assert.isFalse(docPutStub.called)
        assert.isFalse(docUpdateStub.called)
        assert.isFalse(docScanStub.called)
        const s3Url = `https://s3.amazonaws.com/tc-development-bucket/cpptest/${sample[0]}`
        const challengeId = await getChallengeId('MARATHON_MATCH', 9 + testIndex)
        const message = await generateMarathonMatchMessage(config.SUPPORTED_FILE_TYPES.CPP, s3Url, challengeId)
        let verification = {
          Count: 1,
          Items: [generateVerificationMessageItemWithCppCode(challengeId, verificationUrl)]
        }
        verification.Items[0].methods[0].name = signature.method
        verification.Items[0].methods[0].input = signature.input
        if (testIndex === 1) {
          // test mapping
          verification.Items[0].methods[0].input = ['int', 'double', 'string', 'int[]', 'double[]', 'string[]']
        }
        verification.Items[0].methods[0].output = signature.output
        verification.Items[0].className = signature.className
        verification.Items[0].inputs = inputData.map(x => x.input)
        docScanStub.resolves(verification)
        await producer.send(message)
        await waitJob()
        assert.isTrue(docPutStub.called)
        const docPutStubParams = docPutStub.args[0][0]
        const jobId = docPutStubParams.Item.id
        assert.isTrue(fs.existsSync(path.join(__dirname, '../../src/cpp/job', jobId)))
        assert.isTrue(docUpdateStub.called)
        assert.isTrue(docScanStub.called)
        const lastReturn = await docUpdateStub.lastCall.returnValue
        if (testIndex !== 6 && testIndex !== 2) {
          assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Finished', 'should close job with Finished status')
        } else {
          assert.nestedPropertyVal(lastReturn, 'Attributes.status', 'Error', 'should close job with Error status')
        }
        const matchResult = testIndex === 6 ? null : JSON.parse(readTestFile(`case${testIndex}_result.txt`))
        if (testIndex !== 2 && testIndex !== 6) {
          const result = lastReturn.Attributes.results
          should.exist(result)
          result.forEach((r, index) => {
            if (matchResult.error || (matchResult.results && matchResult.results[index].error)) {
              assert.propertyVal(r, 'executeTime', -1, 'should equal -1 if error happens')
              assert.propertyVal(r, 'memory', -1, 'should equal -1 if error happens')
              assert.propertyVal(r, 'score', 0, 'should equal 0 if error happens')
              assert.propertyVal(r, 'error', matchResult.error || matchResult.results[index].error, 'should exist error property if error happens')
            } else {
              assert.property(r, 'score', 'should exist score property in each run code result')
              assert.property(r, 'memory', 'should exist memory property in each run code result')
              assert.property(r, 'executeTime', 'should exist executeTime property in each run code result')
              assert.notProperty(r, 'error', 'should not exist error property when no errors')
              assert.notPropertyVal(r, 'memory', -1, 'should exist memory=-1 property when no errors')
              assert.notPropertyVal(r, 'executeTime', -1, 'should exist executeTime=-1 property when no errors')
            }
          })
        } else if (testIndex === 6) {
          assert.isTrue(errorLogs.includes('The match public method testVectorStrInOutReverse in class MockedClass cannot be found'))
        } else {
          assert.isTrue(errorLogs.includes(matchResult.error))
        }
      })
    })
  })
}
