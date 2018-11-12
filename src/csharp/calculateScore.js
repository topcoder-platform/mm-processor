/**
 * This module defines the method to calculate the score for a submission.
 */
const { exec } = require('child_process')
const threads = require('threads')
const path = require('path')
const fs = require('fs-extra')
const edge = require('edge-js')
const { logger } = require('../common/logger')
const { getDownloadPath, downloadFile, createJob, updateJob, getVerification } = require('../common/aws')

/**
 * Calculate the score for a submission.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id.
 * @param {string} challengeId the challenge id.
 * @param {string} submissionURL the URL to download submission.
 * @param {string} jobId the job id.
 * @returns {object} an object containing the score.
 */
async function calculateScore (submissionId, memberId, challengeId, submissionURL, jobId) {
  await createJob(jobId, submissionId, memberId, challengeId)

  let verification = null
  try {
    // get verification from DynamoDB
    verification = await getVerification(challengeId)
    if (!verification.url.csharp) {
      throw new Error('The verification does not have the code to verify C# submission')
    }

    const [bucketName, key, filename] = getDownloadPath(submissionURL)
    await createJobFolder(jobId, bucketName, key, filename)
    await buildSubmission(jobId)
  } catch (err) {
    await updateJob(jobId, 'Error', null, `Error preparing submission: ${err.message ? err.message : JSON.stringify(err)}`)
    return
  }
  const { results } = await verifySubmission(jobId, verification)
  logger.info(`Submission ${submissionId} has finished processing job=${jobId}`)
  return results
}

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
 * Verify the submission and save the score or error.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 * @returns {Array} the result of running the submission.
 */
async function verifySubmission (jobId, verification) {
  await updateJob(jobId, 'Verification')

  const [bucketName, key] = getDownloadPath(verification.url.csharp)
  const fileData = await downloadFile(bucketName, key)

  try {
    await verifySignature(jobId, verification)
    const results = await runCode(jobId, fileData, verification)
    await updateJob(jobId, 'Finished', results)
    return { results }
  } catch (error) {
    await updateJob(jobId, 'Error', null, error.message ? error.message : JSON.stringify(error))
    return { err: error }
  }
}

/**
 * Verify that the submission has correct class and method definition.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 */
async function verifySignature (jobId, verification) {
  const verifyMethod = edge.func({
    assemblyFile: path.join(__dirname, 'job', jobId, 'project', 'Verification.dll'),
    typeName: 'Verification',
    methodName: 'VerifyClassAndMethod'
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
          return
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

module.exports = calculateScore
