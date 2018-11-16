/**
 * This module defines mock data for the processor services unit tests.
 */

const config = require('config')
const _ = require('lodash')

const validMessage = {
  topic: config.KAFKA.FILTER.TOPIC,
  originator: config.KAFKA.FILTER.ORIGINATOR,
  timestamp: Date.now(),
  'mime-type': 'mime type',
  payload: {
    resource: config.KAFKA.FILTER.RESOURCES[0],
    id: 'submission id',
    challengeId: 'valid challenge id',
    memberId: '123457'
  }
}

const validMessages = [
  validMessage,
  _.merge(_.cloneDeep(validMessage), {
    payload: {
      url: 'http://fake.url.com/path',
      fileType: 'file type',
      isFileSubmission: true
    }
  })
]

const invalidSchemaMessages = [
  _.omit(validMessage, 'topic'),
  _.omit(validMessage, 'originator'),
  _.omit(validMessage, 'timestamp'),
  _.omit(validMessage, 'mime-type'),
  _.omit(validMessage, 'payload'),
  _.omit(validMessage, 'payload.resource'),
  _.omit(validMessage, 'payload.id'),
  _.omit(validMessage, 'payload.challengeId')
]

const filteredOutMessages = [
  _.set(_.cloneDeep(validMessage), 'topic', 'bad topic'),
  _.set(_.cloneDeep(validMessage), 'originator', 'bad originator'),
  _.set(_.cloneDeep(validMessage), 'payload.resource', 'bad resource')
]

const mmChallenge = {
  data: {
    result: {
      content: [
        {
          subTrack: config.CHALLENGE_SUBTRACK
        }
      ]
    }
  }
}

const mmAltChallenge = {
  data: {
    result: {
      content: [
        {
          subTrack: `${config.CHALLENGE_SUBTRACK}-challenge`
        }
      ]
    }
  }
}

const nonMmChallenge = {
  data: {
    result: {
      content: [
        {
          subTrack: 'non-mm-subTrack'
        }
      ]
    }
  }
}

module.exports = {
  invalidSchemaMessages,
  filteredOutMessages,
  validMessages,
  validMessage,
  mmChallenge,
  mmAltCidMessage: _.set(_.cloneDeep(validMessage), 'payload.challengeId', 'alt-mm-id'),
  mmAltChallenge,
  nonMmCidMessage: _.set(_.cloneDeep(validMessage), 'payload.challengeId', 'non-mm-id'),
  nonMmChallenge,
  badCidMessage: _.set(_.cloneDeep(validMessage), 'payload.challengeId', 'badId'),
  serverDownMessage: _.set(_.cloneDeep(validMessage), 'payload.challengeId', 'serverDownId')
}
