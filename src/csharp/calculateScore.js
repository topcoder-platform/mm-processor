/**
 * This module defines the method to calculate the score for a submission.
 */
const { exec } = require('child_process')
const threads = require('threads')
const path = require('path')
const fs = require('fs-extra')
const config = require('config')
const edge = require('edge-js')
const { logger } = require('../common/logger')
const { downloadFile, updateJob } = require('../common/aws')
const { calculateScore } = require('../common/jobUtils')

/**
 * Create the folder to hold the job to compile and run.
 * @param {string} jobId the job id.
 * @param {string} bucketName the bucket name.
 * @param {string} key the key to the S3 object.
 * @param {string} filename the file name.
 */
async function createJobFolder (jobId, bucketName, key, filename) {
  await fs.copy(path.join(__dirname, 'template'), path.join(__dirname, 'job', jobId, 'project'))
  const fileData = await downloadFile(bucketName, key)
  await fs.outputFile(path.join(__dirname, 'job', jobId, 'project', filename), fileData.Body)
  return fileData.Body.toString()
}

/**
 * Build the submission.
 * @param {string} jobId the job id.
 */
async function buildSubmission (jobId) {
  await updateJob(jobId, 'Compile')
  await new Promise((resolve, reject) => {
    exec('mcs -target:library -out:Verification.dll *.cs', {
      cwd: path.join(__dirname, 'job', jobId, 'project')
    }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Verify that the submission has correct class and method definition.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 */
async function verifySignature (jobId, verification) {
  const verifyMethod = edge.func({
    assemblyFile: path.join(__dirname, 'job', jobId, 'project', 'Verification.dll'),
    typeName: config.STATISTICS.CSHARP.CLASS_NAME,
    methodName: config.STATISTICS.CSHARP.CHECK_SIGNATURE
  })
  await new Promise((resolve, reject) => {
    try {
      verification.methods.forEach((method) => {
        const input = {
          className: verification.className,
          ...method
        }
        const ret = verifyMethod(input, true)
        if (ret) {
          reject(new Error(ret))
        }
      })
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Run the submitted code against the verification code.
 * @param {string} jobId the job id.
 * @param {object} fileData the verification code file data.
 * @param {object} verification the verification information.
 * @returns {Array} the result of running the submission.
 */
async function runCode (jobId, fileData, verification) {
  // Set base paths to thread scripts
  threads.config.set({
    basepath: {
      node: __dirname
    }
  })
  return new Promise((resolve, reject) => {
    const { inputs, outputs, className, methods } = verification
    const results = []
    const pool = new threads.Pool(inputs.length)
    inputs.forEach((input, index) => {
      results.push({})
      pool.run('run.js')
        .send({ __dirname: __dirname, jobId, input, output: outputs ? outputs[index] : null, className, methods, verificationData: fileData.Body.toString() })
        .on('error', (error) => {
          logger.error('Failed running job')
          logger.error(error)
          results[index] = {
            error: `Failed to run job for input=${input}`,
            score: 0.0,
            executeTime: -1,
            memory: -1
          }
        })
        .on('done', (data) => {
          results[index] = data
        })
    })
    pool
      .on('finished', () => {
        pool.killAll()
        resolve(results)
      })
  })
}

module.exports = async (submissionId, memberId, challengeId, submissionURL, jobId) =>
  calculateScore('csharp', createJobFolder, buildSubmission, verifySignature, runCode, submissionId, memberId, challengeId, submissionURL, jobId)
