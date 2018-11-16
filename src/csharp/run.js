'use strict'

function runLoop (inputObject, done) {
  const { __dirname, jobId, input, output, className, methods, verificationData } = inputObject
  const path = require('path')
  const config = require('config')
  const edge = require('edge-js')
  const { NodeVM, VMScript } = require('vm2')
  const { logger } = require(path.join(__dirname, '../common/logger'))

  const callMethod = edge.func({
    assemblyFile: path.join(__dirname, 'job', jobId, 'project', 'Verification.dll'),
    typeName: config.STATISTICS.CSHARP.CLASS_NAME,
    methodName: config.STATISTICS.CSHARP.RUN_METHOD
  })

  try {
    const verificationScript = new VMScript(verificationData)
    const vm = new NodeVM({
      sandbox: {
        edge,
        callMethod
      }
    })

    logger.info(`Starting csharp verification for ${jobId}`)
    const verification = vm.run(verificationScript, __dirname)
    const result = verification(input, output, className, methods)
    logger.debug(JSON.stringify(result))
    done(result)
  } catch (err) {
    logger.logFullError(err)
    done({ score: 0.0, error: 'Error in verification', executionTime: -1, memory: -1 })
  }
}

module.exports = runLoop
