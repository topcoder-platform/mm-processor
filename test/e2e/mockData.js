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

async function getChallengeId (subTrack, index = 0) {
  const result = await axios.get(`https://api.topcoder-dev.com/v4/challenges?filter=subTrack=${subTrack}`)
  return result.data.result.content[index].id
}

async function generateMarathonMatchMessage (fileType = 'file type', url = 'http://fake.url.com/path', userCustomId) {
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
          url: url,
          fileType: fileType,
          isFileSubmission: true,
          memberId: 1,
          challengeId: userCustomId || challengeId
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

function generateVerificationMessageItem (challengeId, url) {
  return {
    'id': 'some random id, it does not matter',
    'challengeId': challengeId,
    'className': 'GuessRandom',
    'maxMemory': '64m',
    'inputs': [
      [1],
      [2],
      [3]
    ],
    'methods': [{
      'name': 'guess',
      'input': [],
      'output': 'int'
    }],
    'url': url
  }
}
function generateVerificationMessageItemWithCppCode (challengeId, url) {
  return {
    'id': 'some random id, it does not matter',
    challengeId,
    'className': 'Random',
    'maxMemory': '64m',
    'inputs': [
      [1],
      [2],
      [3]
    ],
    'methods': [{
      'name': 'guess',
      'input': [],
      'output': 'int'
    }],
    'url': {
      cpp: url
    }
  }
}
module.exports = {
  getChallengeId,
  invalidSchemaMessage,
  filteredOutMessage,
  generateMarathonMatchMessage,
  generateDevelopmentMessage,
  generateVerificationMessageItem,
  generateVerificationMessageItemWithCppCode,
  badCidMessage
}
