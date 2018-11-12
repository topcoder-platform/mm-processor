/**
 * This module defines the method to calculate the score for a submission.
 */
const { exec } = require('child_process')
const threads = require('threads')
const path = require('path')
const fs = require('fs-extra')
const replace = require('replace-in-file')
const config = require('config').util.loadFileConfigs(path.join(__dirname, 'config'))
const { logger } = require('../common/logger')
const { getDownloadPath, downloadFile, createJob, updateJob, getVerification } = require('../common/aws')

/**
 * Calculate the score for a submission.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id.
 * @param {string} challengeId the challenge id.
 * @param {string} submissionURL the URL to download submission.
 * @param {string} jobId the job id.
 */
async function calculateScore (submissionId, memberId, challengeId, submissionURL, jobId) {
  await createJob(jobId, submissionId, memberId, challengeId)

  let verification = null
  try {
    // get verification from DynamoDB
    verification = await getVerification(challengeId)
    if (!verification.url.java) {
      throw new Error('The verification does not have the code to verify Java submission')
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
  await fs.mkdirs(path.join(__dirname, 'job', jobId, 'project/src/main/java'))
  await fs.copy(path.join(__dirname, 'template'), path.join(__dirname, 'job', jobId, 'project'))
  await fs.move(path.join(__dirname, 'job', jobId, 'project', 'Statistics.java'), path.join(__dirname, 'job', jobId, 'project/src/main/java', 'Statistics.java'))
  await fs.move(path.join(__dirname, 'job', jobId, 'project', 'StatisticsAspect.java'), path.join(__dirname, 'job', jobId, 'project/src/main/java', 'StatisticsAspect.java'))
  await replace({
    files: path.join(__dirname, 'job', jobId, 'project/src/main/java', '*.java'),
    from: /<class-name>/g,
    to: path.basename(filename, '.java')
  })
  const fileData = await downloadFile(bucketName, key)
  await fs.outputFile(path.join(__dirname, 'job', jobId, 'project/src/main/java', filename), fileData.Body)
}

/**
 * Build the submission.
 * @param {string} jobId the job id.
 * @returns {Promise} a promise which will be resolved when the submission is compiled.
 */
function buildSubmission (jobId) {
  return updateJob(jobId, 'Compile').then(() => {
    return new Promise((resolve, reject) => {
      exec('./gradlew fatJar', {
        cwd: path.join(__dirname, 'job', jobId, 'project')
      }, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })
}

/**
 * Verify the submission and save the score or error.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 * @returns {Promise} a promise which will be resolved when the verification is finished.
 */
async function verifySubmission (jobId, verification) {
  await updateJob(jobId, 'Verification')

  const [bucketName, key] = getDownloadPath(verification.url.java)
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

async function verifySignature (jobId, verification) {
  const java = require('java')
  const { methods } = verification
  const mapping = {
    'int': 'I',
    'double': 'D',
    'string': 'Ljava/lang/String;',
    'int[]': '[I',
    'double[]': '[D',
    'string[]': '[Ljava/lang/String;'
  }
  const samples = {
    'int': 1,
    'double': 1.0,
    'string': 'string'
  }
  const buildSampleInput = (type) => {
    if (samples[type]) {
      return samples[type]
    } else if (type === 'int[]') {
      return java.newArray('int', [1])
    } else if (type === 'double[]') {
      return java.newArray('double', [1.1])
    } else if (type === 'string[]') {
      return java.newArray('java.lang.String', ['String'])
    }
  }

  return new Promise((resolve, reject) => {
    java.options.push('-Xrs')
    java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))
    java.ensureJvm(() => {
      methods.forEach((method) => {
        // check signature
        const args = method.input.map((mIn) => mapping[mIn])
        const ret = mapping[method.output]
        const methodName = `${method.name}(${args})${ret}`
        try {
          const sampleInput = method.input.map((mIn) => buildSampleInput(mIn))
          const submission = java.newInstanceSync(config.STATISTICS.CLASS_NAME)
          java.callMethodSync(submission, methodName, ...sampleInput)
        } catch (err) {
          reject(new Error(`Error in signature for method ${method.name} - ${methodName}`))
        }
      })
      resolve()
    })
  })
}

function runCode (jobId, fileData, verification) {
  // Set base paths to thread scripts
  threads.config.set({
    basepath: {
      node: __dirname
    }
  })
  return new Promise((resolve) => {
    const { inputs, outputs, maxMemory, className, methods } = verification
    const results = []
    const pool = new threads.Pool(inputs.length)
    inputs.forEach((input, index) => {
      results.push({})
      pool.run('run.js')
        .send({ __dirname: __dirname, jobId, input, output: outputs ? outputs[index] : null, maxMemory, className, methods, verificationData: fileData.Body.toString() })
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
