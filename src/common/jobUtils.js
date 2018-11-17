/**
 * This module defines a useful helper methods used to create,build job.
 */
const { createJob, updateJob, getVerification, downloadFile } = require('./aws')
const { getDownloadPath } = require('./aws')
const { logger } = require('./logger')

/**
 * Calculate the score for a submission.
 * @param {string} lag the code language.
 * @param {Promise} createJobFolder the create job folder function.
 * @param {Promise} buildSubmission the build submission function.
 * @param {Promise} verifySignature the verify signature function.
 * @param {Promise} runCode the run code function.
 * @param {string} submissionId the submission id.
 * @param {string} memberId the member id.
 * @param {string} challengeId the challenge id.
 * @param {string} submissionURL the URL to download submission.
 * @param {string} jobId the job id.
 */
async function calculateScore (lag, createJobFolder, buildSubmission, verifySignature, runCode, submissionId, memberId, challengeId, submissionURL, jobId) {
  /**
   * Verify the submission and save the score or error.
   * @param {string} jobId the job id.
   * @param {object} verification the verification information.
   * @param {string} submissionCode the submission code.
   * @returns {Promise} a promise which will be resolved when the verification is finished.
   */
  async function verifySubmission (jobId, verification, submissionCode) {
    await updateJob(jobId, 'Verification')
    const [bucketName, key] = getDownloadPath(verification.url[lag])
    const fileData = await downloadFile(bucketName, key)

    try {
      if (verifySignature) {
        await verifySignature(jobId, verification, submissionCode)
      }
      const results = await runCode(jobId, fileData, verification, submissionCode)
      await updateJob(jobId, 'Finished', results)
      return { results }
    } catch (error) {
      logger.logFullError(error)
      const errorMessage = error.message ? error.message : JSON.stringify(error)
      await updateJob(jobId, 'Error', null, errorMessage)
      return { err: errorMessage }
    }
  }
  await createJob(jobId, submissionId, memberId, challengeId)
  let verification = null
  let submissionCode
  try {
    // get verification from DynamoDB
    verification = await getVerification(challengeId)
    if (!verification.url[lag]) {
      throw new Error(`The verification does not have the code to verify ${lag} submission`)
    }

    const [bucketName, key, filename] = getDownloadPath(submissionURL)
    submissionCode = await createJobFolder(jobId, bucketName, key, filename)
    if (buildSubmission) {
      await buildSubmission(jobId)
    }
  } catch (err) {
    logger.logFullError(err)
    await updateJob(jobId, 'Error', null, `Error preparing submission: ${err.message ? err.message : JSON.stringify(err)}`)
    return
  }
  const verifyResult = await verifySubmission(jobId, verification, submissionCode)
  logger.info(`Submission ${submissionId} has finished processing job=${jobId}`)
  return verifyResult // could exist err or results in verification result.
}
module.exports = {
  calculateScore
}
