/**
 * This module defines the method to calculate the score for a submission.
 */
const { exec } = require('child_process')
const threads = require('threads')
const path = require('path')
const fs = require('fs-extra')
const replace = require('replace-in-file')
const config = require('config')
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
  await fs.mkdirs(path.join(__dirname, 'job', jobId, 'project/src/main/java'))
  await fs.copy(path.join(__dirname, 'template'), path.join(__dirname, 'job', jobId, 'project'))
  await fs.move(path.join(__dirname, 'job', jobId, 'project', 'Statistics.java'), path.join(__dirname, 'job', jobId, 'project/src/main/java', 'Statistics.java'))
  await fs.move(path.join(__dirname, 'job', jobId, 'project', 'StatisticsAspect.java'), path.join(__dirname, 'job', jobId, 'project/src/main/java', 'StatisticsAspect.java'))

  const fileData = await downloadFile(bucketName, key, path.join(__dirname, 'job', jobId, 'project/src/main/java'))
  await replace({
    files: path.join(__dirname, 'job', jobId, 'project/src/main/java', '*.java'),
    from: /<class-name>/g,
    to: path.basename(fileData, '.java')
  })
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

async function verifySignature (jobId, verification) {
  const java = require('java')
  const { methods, className } = verification
  return new Promise((resolve, reject) => {
    java.options.push('-Xrs')
    java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))
    java.ensureJvm(() => {
      methods.forEach((method) => {
        try {
          java.callStaticMethodSync(config.STATISTICS.JAVA.CLASS_NAME, config.STATISTICS.JAVA.CHECK_SIGNATURE,
            className, method.name, method.output, java.newArray('java.lang.String', method.input || []))
        } catch (err) {
          reject(new Error(err.cause ? err.cause.getMessageSync() : err.message))
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

module.exports = async (submissionId, memberId, challengeId, submissionURL, jobId) =>
  calculateScore('java', createJobFolder, buildSubmission, verifySignature, runCode, submissionId, memberId, challengeId, submissionURL, jobId)
