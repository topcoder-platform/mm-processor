'use strict'

function runLoop (inputObject, done) {
  const { __dirname, jobId, inputs, outputs, className, methods, verificationData, submissionCode } = inputObject
  const path = require('path')
  const { runSubmissionAsync } = require('cpp-mm-scoring')
  const { NodeVM, VMScript } = require('vm2')
  const { logger } = require(path.join(__dirname, '../common/logger'))

  try {
    const verificationScript = new VMScript(verificationData)
    const vm = new NodeVM({
      sandbox: {
        runCppScoring: runSubmissionAsync
      }
    })
    logger.info(`Starting cpp verification for ${jobId}`)
    const verification = vm.run(verificationScript, __dirname)
    verification(inputs, outputs, className, methods, submissionCode, (results) => {
      logger.debug(JSON.stringify(results))
      done(results)
    })
  } catch (err) {
    logger.logFullError(err)
    done(Array.from(Array(inputs.length), () => ({ executeTime: -1, memory: -1, score: 0.0, error: 'Error in verification' })))
  }
}

module.exports = runLoop
