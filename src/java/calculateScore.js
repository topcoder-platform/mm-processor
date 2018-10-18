/**
 * This module defines the method to calculate the score for a submission.
 */
const { exec } = require('child_process')
const vm = require('vm')
const path = require('path')
const fs = require('fs-extra')
const AWS = require('aws-sdk')
const moment = require('moment')
const config = require('config').util.loadFileConfigs(path.join(__dirname, 'config'))
const { logger } = require('../common/logger')

const S3 = new AWS.S3({
  accessKeyId: config.AWS.ACCESS_KEY_ID,
  secretAccessKey: config.AWS.SECRET_ACCESS_KEY,
  region: config.AWS.REGION
})

const DynamoDB = new AWS.DynamoDB({
  accessKeyId: config.AWS.ACCESS_KEY_ID,
  secretAccessKey: config.AWS.SECRET_ACCESS_KEY,
  region: config.AWS.REGION
})

const DocumentClient = new AWS.DynamoDB.DocumentClient({
  service: DynamoDB
})

const s3UrlPattern = /^https:\/\/(.*)\.?s3\.amazonaws\.com\/(.+)$/

/**
 * Calculate the score for a submission.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id.
 * @param {string} challengeId the challenge id.
 * @param {string} submissionURL the URL to download submission.
 * @param {string} jobId the job id.
 */
async function calculateScore (submissionId, memberId, challengeId, submissionURL, jobId) {
  const [bucketName, key, filename] = getDownloadPath(submissionURL)
  if (!bucketName) {
    return
  }

  await createJob(jobId, submissionId, memberId, challengeId)

  await createJobFolder(jobId, bucketName, key, filename)

  await buildSubmission(jobId)

  const verification = await getVerification(challengeId)
  if (verification === null || verification.Count !== 1) {
    logger.debug(`The verification information cannot be found or mutiple verifications are found`)
    return
  }
  const score = await verifySubmission(jobId, verification.Items[0])

  logger.debug(`Submission ${submissionId} has finished processing with score ${score}`)
  return {
    score
  }
}

/**
 * Get the path to download an object from S3.
 * @param {string} url the URL of the S3 object.
 * @returns {Array} an array of strings of the bucket name, key, and file name.
 */
function getDownloadPath (url) {
  const matches = s3UrlPattern.exec(url)
  if (matches === null) {
    logger.debug('The URL is not for S3, ignore')
    return
  }
  let bucketName = matches[1]
  let key = matches[2]
  let filename = key.substring(key.lastIndexOf('/') + 1)
  if (bucketName.length === 0) {
    bucketName = key.substring(0, key.indexOf('/'))
    key = key.substring(key.indexOf('/') + 1)
  }
  return [bucketName, key, filename]
}

/**
 * Download a file from S3 bucket.
 * @param {string} bucketName the S3 bucket name.
 * @param {string} key the key to the S3 object.
 * @returns {Promise} a promise which will be resolved when the file is downloaded.
 */
function downloadFile (bucketName, key) {
  logger.debug(`Getting file from bucket ${bucketName} for key ${key}`)
  return S3.getObject({
    Bucket: bucketName,
    Key: key
  }).promise()
}

/**
 * Create a job.
 * @param {string} jobId the job id.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id, can be either a string or integer.
 * @param {string} challengeId the challenge id.
 * @returns {Promise} a promise which will be resolved when the job record is created.
 */
function createJob (jobId, submissionId, memberId, challengeId) {
  return DocumentClient.put({
    TableName: config.AWS.JOB_TABLE_NAME,
    Item: {
      id: jobId,
      submissionId,
      challengeId,
      memberId,
      createdOn: moment().toISOString(),
      updatedOn: moment().toISOString(),
      status: 'Start'
    }
  }).promise()
}

/**
 * Update a job.
 * @param {string} jobId the job id.
 * @param {string} status the job status.
 * @param {number} score the score, optional.
 * @param {string} error the error, optional.
 * @returns {Promise} a promise which will be resolved when the job record is updated.
 */
function updateJob (jobId, status, score, error) {
  let updateExpression = 'set #status = :status, #updatedOn = :updatedOn'
  let expressionAttributeNames = {
    '#status': 'status',
    '#updatedOn': 'updatedOn'
  }
  let expressionAttributeValues = {
    ':status': status,
    ':updatedOn': moment().toISOString()
  }
  if (score) {
    updateExpression = updateExpression + ', #score = :score'
    expressionAttributeNames['#score'] = 'score'
    expressionAttributeValues[':score'] = score
  }
  if (error) {
    updateExpression = updateExpression + ', #error = :error'
    expressionAttributeNames['#error'] = 'error'
    expressionAttributeValues[':error'] = error
  }
  let params = {
    TableName: config.AWS.JOB_TABLE_NAME,
    Key: {
      id: jobId
    },
    ReturnValues: 'UPDATED_NEW',
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }
  return DocumentClient.update(params).promise()
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
      exec('./gradlew jar', {
        cwd: path.join(__dirname, 'job', jobId, 'project')
      }, (err, o) => {
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
 * Get the verification information.
 * @param {string} challengeId the challenge id.
 * @returns {Promise} a promise which will be resolved when the verification record is found.
 */
function getVerification (challengeId) {
  return DocumentClient.scan({
    TableName: config.AWS.VERIFICATION_TABLE_NAME,
    FilterExpression: 'challengeId = :challengeId',
    ExpressionAttributeValues: { ':challengeId': challengeId },
    Select: 'ALL_ATTRIBUTES'
  }).promise()
}

/**
 * Verify the submission and save the score or error.
 * @param {string} jobId the job id.
 * @param {object} verification the verification information.
 * @returns {Promise} a promise which will be resolved when the verification is finished.
 */
function verifySubmission (jobId, verification) {
  const [bucketName, key] = getDownloadPath(verification.url)
  return updateJob(jobId, 'Verification').then(() => {
    return downloadFile(bucketName, key)
  }).then((fileData) => {
    const script = new vm.Script(fileData.Body.toString())
    const java = require('java')
    java.classpath.push(path.join(__dirname, 'job', jobId, 'build', 'submission.jar'))
    const sandbox = {
      java,
      verification
    }
    return new Promise((resolve, reject) => {
      script.runInNewContext(sandbox)
      if (sandbox.error) {
        reject(sandbox.error)
      } else {
        resolve(sandbox.score)
      }
    })
  }).then((score) => {
    return updateJob(jobId, 'Finished', score)
  }, (error) => {
    return updateJob(jobId, 'Error', null, error)
  }).then((job) => {
    return new Promise((resolve, reject) => {
      if (job.Attributes.status === 'Finished') {
        resolve(job.Attributes.score)
      } else {
        reject(job.Attributes.error)
      }
    })
  })
}

module.exports = calculateScore
