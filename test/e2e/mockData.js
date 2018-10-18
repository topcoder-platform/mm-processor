/**
 * This module defines mock data for end to end tests.
 */

const config = require('config')
const axios = require('axios')

const invalidSchemaMessage = {
  topic: config.KAFKA.TOPIC,
  message: {
    value: JSON.stringify({ invalidKey: 'some value' })
  }
}

const filteredOutMessage = {
  topic: config.KAFKA.TOPIC,
  message: {
    value: JSON.stringify({
      topic: 'some topic',
      originator: 'some originator',
      timestamp: Date.now(),
      'mime-type': 'mime-type',
      payload: {
        resource: 'some resource',
        id: 'submission id',
        challengeId: 'challenge id',
        memberId: 1
      }
    })
  }
}

async function getChallengeId (subTrack) {
  const result = await axios.get(`https://api.topcoder-dev.com/v4/challenges?filter=subTrack=${subTrack}`)
  return result.data.result.content[0].id
}

async function generateMarathonMatchMessage () {
  const challengeId = await getChallengeId('MARATHON_MATCH')
  return {
    topic: config.KAFKA.TOPIC,
    message: {
      value: JSON.stringify({
        topic: config.KAFKA.FILTER.TOPIC,
        originator: config.KAFKA.FILTER.ORIGINATOR,
        timestamp: Date.now(),
        'mime-type': 'mime-type',
        payload: {
          resource: config.KAFKA.FILTER.RESOURCES[0],
          id: 'submission id',
          url: 'http://fake.url.com/path',
          fileType: 'file type',
          isFileSubmission: true,
          memberId: 1,
          challengeId
        }
      })
    }
  }
}

async function generateDevelopmentMessage () {
  const challengeId = await getChallengeId('DEVELOPMENT')
  return {
    topic: config.KAFKA.TOPIC,
    message: {
      value: JSON.stringify({
        topic: config.KAFKA.FILTER.TOPIC,
        originator: config.KAFKA.FILTER.ORIGINATOR,
        timestamp: Date.now(),
        'mime-type': 'mime-type',
        payload: {
          resource: config.KAFKA.FILTER.RESOURCES[0],
          id: 'submission id',
          memberId: 1,
          challengeId
        }
      })
    }
  }
}

const badCidMessage = {
  topic: config.KAFKA.TOPIC,
  message: {
    value: JSON.stringify({
      topic: config.KAFKA.FILTER.TOPIC,
      originator: config.KAFKA.FILTER.ORIGINATOR,
      timestamp: Date.now(),
      'mime-type': 'mime-type',
      payload: {
        resource: config.KAFKA.FILTER.RESOURCES[0],
        id: 'submission id',
        memberId: 1,
        challengeId: 'notAChallengeId'
      }
    })
  }
}

module.exports = {
  invalidSchemaMessage,
  filteredOutMessage,
  generateMarathonMatchMessage,
  generateDevelopmentMessage,
  badCidMessage
}
