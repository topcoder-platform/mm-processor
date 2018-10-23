'use strict'

const mapping = {
  'int': 'I',
  'double': 'D',
  'string': 'Ljava/lang/String;',
  'int[]': '[I',
  'double[]': '[D',
  'string[]': '[java/lang/String;'
}

function runLoop (inputObject, done) {
  const { __dirname, jobId, input, output, maxMemory, className, methods, verificationData } = inputObject
  const path = require('path')
  const java = require('java')
  const { NodeVM, VMScript } = require('vm2')
  const { logger } = require(path.join(__dirname, '../common/logger'))

  java.options.push('-Xrs')
  if (maxMemory) {
    java.options.push(`-Xmx${maxMemory}`)
    logger.debug(`Setting max heap stack memory to ${maxMemory}`)
  }
  java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))

  java.ensureJvm(() => {
    try {
      const submission = java.newInstanceSync(className)
      // check signature
      methods.forEach((method) => {
        const args = method.input.map((mIn) => mapping[mIn])
        const ret = mapping[method.output]
        const methodName = `${method.name}(${args})${ret}`
        java.callMethodSync.apply(java, [submission, methodName, ...method.input])
      })

      const verificationScript = new VMScript(verificationData)
      const vm = new NodeVM({
        sandbox: {
          java,
          submission
        }
      })

      logger.info(`Starting verification for ${jobId}`)
      const verification = vm.run(verificationScript, __dirname)
      const results = verification(input, output, className, methods)
      logger.debug(results)
      done(results)
    } catch (err) {
      logger.error(err)
      done({ score: 0.0, error: 'Error in verification' })
    }
  })
}

module.exports = runLoop
