'use strict'

function runLoop (inputObject, done) {
  const { __dirname, jobId, input, output, maxMemory, className, methods, verificationData } = inputObject
  const path = require('path')
  const java = require('java')
  const { NodeVM, VMScript } = require('vm2')
  const { logger } = require(path.join(__dirname, '../common/logger'))
  const config = require('config')

  java.options.push('-Xrs')
  if (maxMemory) {
    java.options.push(`-Xmx${maxMemory}`)
    logger.debug(`Setting max heap stack memory to ${maxMemory}`)
  }
  java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))

  java.ensureJvm(() => {
    try {
      const submission = java.newInstanceSync(config.STATISTICS.JAVA.CLASS_NAME)
      const verificationScript = new VMScript(verificationData)
      const vm = new NodeVM({
        sandbox: {
          java,
          submission
        }
      })

      logger.info(`Starting java verification for ${jobId}`)
      const verification = vm.run(verificationScript, __dirname)
      const results = verification(input, output, className, methods)
      if (!results.error) {
        results.memory = parseInt(submission.getMemorySync() / 1024) // KBytes
        results.executeTime = submission.getExecuteTimeSync() // milliseconds
      } else {
        // usually no need
        results.score = 0
        results.memory = -1
        results.executeTime = -1
      }
      logger.debug(JSON.stringify(results))
      done(results)
    } catch (err) {
      logger.logFullError(err)
      if (err && err.cause && java.instanceOf(err.cause, 'java.lang.OutOfMemoryError')) {
        done({ executeTime: -1, memory: -1, score: 0.0, error: `OutOfMemoryError happened with max memory=${maxMemory}` })
      } else {
        done({ executeTime: -1, memory: -1, score: 0.0, error: 'Error in verification' })
      }
    }
  })
}

module.exports = runLoop
