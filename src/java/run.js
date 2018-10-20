'use strict'

const mapping = {
  'int': 'I',
  'double': 'D',
  'string': 'Ljava/lang/String;',
  'int[]': '[I',
  'double[]': '[D',
  'string[]': '[java/lang/String;',
}

const runLoop = (inputObject, done) => {
  const { __dirname, jobId, input, output, maxMemory, className, methods, verificationData } = inputObject
  const path = require('path')
  const java = require('java')
  const { NodeVM, VMScript } = require('vm2')
  const { logger } = require(__dirname + '/../common/logger')

  java.options.push('-Xrs')
  if (maxMemory) {
    java.options.push(`-Xmx${maxMemory}`)
    logger.debug(`Setting max heap stack memory to ${maxMemory}`)
  }
  java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))

  java.ensureJvm(() => {
    // check signature
    methods.forEach((method) => {
      const args = method.input.map((mIn) => mapping[mIn])
      const ret = method.output.map((mOut) => mapping[mOut]).shift()
      const methodName = `${method.name}(${args})${ret}`
      try {
        var instance = java.newInstanceSync(className)
        const methodReturn = java.callMethodSync.apply(java, [instance, methodName, ...method.input])
      } catch(err) {
        logger.debug(`Wrong method signature`)
        throw new Error(err)
      }
    })

    const verificationScript = new VMScript(verificationData)
    const vm = new NodeVM({
      sandbox: {
        java
      }
    })
    const verification = vm.run(verificationScript, __dirname)
    done(verification(input, output, className, methods))
  })
}

module.exports = runLoop
