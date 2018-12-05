/**
 * This module defines the methods to access AWS S3 and DynamoDB.
 */

const AWS = require('aws-sdk')
const moment = require('moment')
const path = reuire('path')
const Joi = require('joi')
const config = require('config')
const { logger } = require('./logger')
const unzip = require('unzipper')

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

const MethodSchema = Joi.object({
  input: Joi.array().items(Joi.string()).min(0).required(),
  name: Joi.string().trim().required(),
  output: Joi.string()
})

const verificationSchema = Joi.object({
  id: Joi.string().required(),
  className: Joi.string().required(),
  challengeId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  maxMemory: Joi.string().required(),
  url: Joi.object({ java: Joi.string(), csharp: Joi.string(), cpp: Joi.string() }).required(),
  methods: Joi.array().items(MethodSchema).min(1).required(),
  inputs: Joi.array().min(1).required(),
  outputs: Joi.array()
}).required()

/**
 * Get the path to download an object from S3.
 * @param {string} url the URL of the S3 object.
 * @returns {Array} an array of strings of the bucket name, key, and file name.
 */
function getDownloadPath (url) {
  const matches = s3UrlPattern.exec(url)
  if (matches === null) {
    logger.error('The URL is not for S3')
    throw new Error(`The URL is not for S3: ${url}`)
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
 * Get the file type from the archived submission file
 * @param {string} url the URL of the S3 object.
 * @returns {string} submission file type.
 */
async function getFileType (s3Url) {
  const s3ObjectInfo = getDownloadPath(s3Url)
  const zipFile = S3.getObject({ Bucket: s3ObjectInfo[0], Key: s3ObjectInfo[1] }).createReadStream()
  let fileName
  await zipFile.pipe(unzip.Parse())
    .on('entry', function (entry) {
      fileName = entry.path
  }).promise();

  return path.extname(fileName)
}

/**
 * Download a file from S3 bucket.
 * @param {string} bucketName the S3 bucket name.
 * @param {string} key the key to the S3 object.
 * @returns {object} the downloaded file data.
 */
async function downloadFile (bucketName, key, unzipPath) {
  logger.debug(`Getting file from bucket ${bucketName} for key ${key}`)
  const fileExt = path.extname(key)
  if (fileExt.toLowerCase() === '.zip') {
    const zipFile = S3.getObject({ Bucket: bucketName, Key: key }).createReadStream()
    let fileName
    await zipFile.pipe(unzip.Parse())
      .on('entry', function (entry) {
        fileName = entry.path
    }).promise();
    
    await zipFile.pipe(unzip.Extract({ path: `${unzipPath}` })).promise()
    return fileName
  } else {
    return S3.getObject({
        Bucket: bucketName,
        Key: key
    }).promise()
  }
}

/**
 * Create a job.
 * @param {string} jobId the job id.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id, can be either a string or integer.
 * @param {string} challengeId the challenge id.
 * @returns {object} the created job record.
*/
async function createJob (jobId, submissionId, memberId, challengeId) {
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
 * @param {Array} results the results, optional.
 * @param {string} error the error, optional.
 * @returns {object} the updated job record.
*/
async function updateJob (jobId, status, results, error) {
  let updateExpression = 'set #status = :status, #updatedOn = :updatedOn'
  let expressionAttributeNames = {
    '#status': 'status',
    '#updatedOn': 'updatedOn'
  }
  let expressionAttributeValues = {
    ':status': status,
    ':updatedOn': moment().toISOString()
  }
  if (results) {
    updateExpression = updateExpression + ', #results = :results'
    expressionAttributeNames['#results'] = 'results'
    expressionAttributeValues[':results'] = results
  }
  if (error) {
    logger.error(error)
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
 * Get the verification information.
 * @param {string} challengeId the challenge id.
 * @returns {object} the verification records for the given challenge.
 */
async function getVerification (challengeId) {
  const verifications = await DocumentClient.scan({
    TableName: config.AWS.VERIFICATION_TABLE_NAME,
    FilterExpression: 'challengeId = :challengeId',
    ExpressionAttributeValues: { ':challengeId': challengeId },
    Select: 'ALL_ATTRIBUTES'
  }).promise()
  if (verifications === null || verifications.Count !== 1) {
    throw new Error('The verification information cannot be found or multiple verifications are found')
  }
  const verification = verifications.Items[0]
  await verificationSchema.validate(verification, { abortEarly: false })
  logger.debug('Verification object retrieved from database')
  return verification
}

module.exports = {
  getDownloadPath,
  downloadFile,
  createJob,
  updateJob,
  getVerification,
  getFileType
}
