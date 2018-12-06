/**
 * This module defines the method to calculate the score for a c++ submission.
 */
const path = require('path')
const fs = require('fs-extra')
const config = require('config')
const { checkSignatureAsync } = require('cpp-mm-scoring')
const run = require('./run')
const { logger } = require('../common/logger')
const { downloadFile } = require('../common/aws')
const { calculateScore } = require('../common/jobUtils')
const mappCppType = (ctype) => config.TYPE_MAPPINGS.cpp[ctype] || ctype
const undeclaredRe = /undeclared identifier '(.*)'/i

/**
 * Create the folder to hold the job to compile and run.
 * @param {string} jobId the job id.
 * @param {string} bucketName the bucket name.
 * @param {string} key the key to the S3 object.
 * @param {string} filename the file name.
 * @returns {Promise} a promise which will be resolved when the submission code.
 */
async function createJobFolder (jobId, bucketName, key, filename) {
  await fs.mkdirs(path.join(__dirname, 'job', jobId))
  const fileName = await downloadFile(bucketName, key, path.join(__dirname, 'job', jobId))
  return fs.readFileSync(path.join(__dirname, 'job', jobId, fileName), 'utf8');
}

/**
 * Run code
 * @param jobId the job id.
 * @param fileData the verification file data.
 * @param verification the verification object.
 * @param submissionCode
 * @returns {Bluebird | Bluebird<any>}
 */
function runCode (jobId, fileData, verification, submissionCode) {
  return new Promise((resolve) => {
    const { inputs, outputs, maxMemory, className, methods } = verification
    // mapping default type to supported type by node addons
    for (let i = 0; i < methods.length; i++) {
      methods[i].input = methods[i].input.map(x => mappCppType(x))
      methods[i].output = mappCppType(methods[i].output)
    }
    run({
      __dirname: __dirname,
      jobId,
      inputs,
      outputs,
      maxMemory,
      className,
      methods,
      verificationData: fileData.Body.toString(),
      submissionCode
    }, (results) => {
      resolve(results)
    })
  })
}

/**
 * Verify that the submission has correct class and method definition.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 * @param {string} submissionCode the submission code.
 */
async function verifySignature (jobId, verification, submissionCode) {
  const { className, methods } = verification
  const signature = {
    input: methods[0].input,
    output: methods[0].output,
    className,
    method: methods[0].name
  }
  signature.input = signature.input.map(x => mappCppType(x))
  signature.output = mappCppType(signature.output)
  const result = await checkSignatureAsync(signature, submissionCode)
  // extract error message to match other processors.
  if (result.error) {
    logger.error('Error to verify c++ signature')
    logger.error(result.error)
    const foundUndeclared = result.error.match(undeclaredRe)
    if (foundUndeclared) {
      if (foundUndeclared[1] === className) {
        throw new Error(`The class ${className} cannot be found`)
      } else if (foundUndeclared[1] === methods[0].name) {
        throw new Error(`The match public method ${methods[0].name} in class ${className} cannot be found`)
      }
    }
    throw new Error(result.error)
  }
  if (!result.exist) {
    throw new Error(`The match public method ${methods[0].name} in class ${className} cannot be found`)
  }
}

module.exports = async (submissionId, memberId, challengeId, submissionURL, jobId) =>
  calculateScore('cpp', createJobFolder, null, verifySignature, runCode, submissionId, memberId, challengeId, submissionURL, jobId)
