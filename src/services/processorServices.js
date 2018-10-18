/**
 * This module defines services for the processor.
 */

const axios = require('axios')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const { logger } = require('../common/logger')

const calculateScoreJava = require('../java/calculateScore')

/**
 * Process the message.
 * @param {object} message - The message.
 * @param {string} message.topic - The message topic.
 * @param {string} message.originator - The message originator.
 * @param {string} message.timestamp - The message timestamp.
 * @param {object} message.payload - The message payload.
 * @param {string} message.resource - The resource type of the payload.
 * @param {string} message.payload.id - The submission id of the payload.
 * @param {string} message.payload.challengeId - The challenge id of the payload.
 */
async function processMessage (message) {
  // validate the message schema
  message = await messageSchema.validate(message, { abortEarly: false })
  try {
    // filter the message based on its values
    await filterSchema.validate(message, { abortEarly: false })
  } catch (err) {
    if (err.isJoi) { // catch joi errors thrown by filtering
      logger.debug(`Filtered Out Message Reason: ${err.details.map(detail => detail.message.replace(/"/g, '`')).join(', ')}`)
      logger.debug(`Filtered Out Message: ${JSON.stringify(message, null, 2)}`)
      return
    } else { // otherwise throw the error
      throw err
    }
  }
  // attempt to retrieve the subTrack of the challenge
  const subTrack = await getSubTrack(message.payload.challengeId)
  if (subTrack && subTrack.search(config.CHALLENGE_SUBTRACK) > -1) { // challenge matches configured CHALLENGE_SUBTRACK
    await processMMSubmission(message)
    logger.debug(`Successful Processing of MM Message: ${JSON.stringify(message, null, 2)}`)
  } else if (subTrack) { // challenge does not match configured CHALLENGE_SUBTRACK
    logger.debug(`Ignore Message: ${JSON.stringify(message, null, 2)}`)
  }
}

/**
 * Get the subtrack for a challenge.
 * @param {string} challengeId - The id of the challenge.
 * @returns {string} The subtrack type of the challenge.
 */
async function getSubTrack (challengeId) {
  try {
    // attempt to fetch the subtrack
    const result = await axios.get(config.CHALLENGE_INFO_API.replace('{cid}', challengeId))
    return result.data.result.content[0].subTrack
  } catch (err) {
    if (err.response) { // non-2xx response received
      logger.error(`Challenge Details API Error: ${JSON.stringify({
        data: err.response.data,
        status: err.response.status,
        headers: err.response.headers
      }, null, 2)}`)
    } else if (err.request) { // request sent, no repspone received
      logger.error(`Challenge Details API Error (request sent, no response): ${JSON.stringify(err.request, null, 2)}`)
    } else {
      logger.logFullError(err)
    }
  }
}

/**
 * Process the MM submission
 * @param {object} message - the message
 */
async function processMMSubmission (message) {
  if (message.payload.fileType !== 'java') {
    logger.debug('Submission is not Java code, ignore')
    return
  }
  const id = uuid()
  await calculateScoreJava(message.payload.id, String(message.payload.memberId), String(message.payload.challengeId), message.payload.url, id)
}

// message schema used to validate messages
const messageSchema = Joi.object().keys({
  topic: Joi.string().required(),
  originator: Joi.string().required(),
  timestamp: Joi.date().required(),
  'mime-type': Joi.string().required(),
  payload: Joi.object().keys({
    resource: Joi.string().required(),
    id: Joi.string().required(),
    challengeId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    memberId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    url: Joi.string().uri().trim(),
    fileType: Joi.string(),
    filename: Joi.string(),
    isFileSubmission: Joi.boolean()
  }).unknown(true).required()
}).required()

// filter schema used to filter messages based on there value
const filterSchema = Joi.object().keys({
  topic: Joi.string().valid(config.KAFKA.FILTER.TOPIC).required(),
  originator: Joi.string().valid(config.KAFKA.FILTER.ORIGINATOR).required(),
  payload: Joi.object().keys({
    resource: Joi.alternatives().try(...config.KAFKA.FILTER.RESOURCES.map(resource => Joi.string().valid(resource))).required()
  }).unknown(true).required()
}).unknown(true).required()

module.exports = {
  processMessage
}
