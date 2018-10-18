/**
 * This module defines unit tests for the processor services.
 */

const proxyquire = require('proxyquire').noCallThru()
const sinon = require('sinon')
const config = require('config')
const { assert } = require('chai')
const {
  invalidSchemaMessages,
  filteredOutMessages,
  validMessages,
  validMessage,
  mmChallenge,
  mmAltCidMessage,
  mmAltChallenge,
  nonMmCidMessage,
  nonMmChallenge,
  badCidMessage,
  serverDownMessage
} = require('./mockData')

// mocked dependencies
const debugLogs = []
const errorLogs = []
const loggerStub = {
  debug: (message) => {
    debugLogs.push(message)
  },
  error: (message) => {
    errorLogs.push(message)
  }
}
const axiosStub = {
  get: sinon.stub()
}
axiosStub.get.withArgs(config.CHALLENGE_INFO_API.replace('{cid}', validMessage.payload.challengeId)).returns(mmChallenge)
axiosStub.get.withArgs(config.CHALLENGE_INFO_API.replace('{cid}', mmAltCidMessage.payload.challengeId)).returns(mmAltChallenge)
axiosStub.get.withArgs(config.CHALLENGE_INFO_API.replace('{cid}', nonMmCidMessage.payload.challengeId)).returns(nonMmChallenge)
axiosStub.get.withArgs(config.CHALLENGE_INFO_API.replace('{cid}', badCidMessage.payload.challengeId)).throws({
  response: {
    data: 'data',
    status: 'status',
    headers: 'headers'
  }
})
axiosStub.get.withArgs(config.CHALLENGE_INFO_API.replace('{cid}', serverDownMessage.payload.challengeId)).throws({
  request: 'request'
})

// unit under test
const processMessage = proxyquire('../../../src/services/processorServices', {
  '../common/logger': {
    logger: loggerStub
  },
  'axios': axiosStub
}).processMessage

describe('The processor services', () => {
  beforeEach(() => {
    debugLogs.length = 0
    errorLogs.length = 0
  })
  describe('The message processor', () => {
    it('Should validate the message schema', async () => {
      for (let message of invalidSchemaMessages) {
        try {
          await processMessage(message)
          throw new Error() // make sure catch block runs
        } catch (err) {
          assert(err.isJoi, 'message is validated')
        }
      }
    })
    it('Should filter the message based on `topic`, `originator`, `payload.resource`', async () => {
      for (let message of filteredOutMessages) {
        await processMessage(message)
        let found = debugLogs.find((message) => {
          return message.startsWith('Filtered Out Message')
        })
        assert.isDefined(found, 'filter out messages based on `topic`, `originator`, and `payload.resource`')
        debugLogs.length = 0
      }
    })
    it('Should appropriately handle `MARATHON_MATCH` challenge messages', async () => {
      for (let m of validMessages) {
        await processMessage(m)
        let found = debugLogs.find((message) => {
          return message.startsWith('Successful Processing of MM Message')
        })
        assert.isDefined(found, 'log success message for MM messages')
        debugLogs.length = 0
      }
    })
    it('Should accept subTrack values with substring match to `MARATHON_MATCH`', async () => {
      await processMessage(mmAltCidMessage)
      let found = debugLogs.find((message) => {
        return message.startsWith('Successful Processing of MM Message')
      })
      assert.isDefined(found, 'log success message for MM messages')
    })
    it('Should appropriately handle non-`MARATHON_MATCH` challenge messages', async () => {
      await processMessage(nonMmCidMessage)
      let found = debugLogs.find((message) => {
        return message.startsWith('Ignore')
      })
      assert.isDefined(found, 'log ignore message for non-mm challenges')
    })
    it('Should handle request to challenge details api errors', async () => {
      await processMessage(badCidMessage)
      let found = errorLogs.find((message) => {
        return message.startsWith('Challenge Details API Error')
      })
      assert.isDefined(found, 'log errors encountered fetching challenge details')
    })
    it('Should handle challenge details api server errors', async () => {
      await processMessage(serverDownMessage)
      let found = errorLogs.find((message) => {
        return message.startsWith('Challenge Details API Error')
      })
      assert.isDefined(found, 'log errors encountered fetching challenge details')
    })
  })
})
