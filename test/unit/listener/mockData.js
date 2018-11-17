/**
 * This module defines mock data for unit tests.
 */

// mock kafka consumer options
const kafkaOptions = {
  connectionString: 'connectionString',
  groupId: 'groupId',
  handlerConcurrency: 10,
  ssl: { cert: 'cert', key: 'key' }
}

// mock kafka message set
let messageSet = [
  {
    offset: 0,
    message: {
      value: Buffer.from(JSON.stringify({
        'topic': 'topic',
        'originator': 'originator',
        'timestamp': 'timestamp',
        'mime-type': 'mime-type',
        'payload': {
          'key1': 'val1',
          'key2': 'val2'
        }
      }), 'utf8')
    }
  },
  {
    offset: 1,
    message: {
      value: Buffer.from(JSON.stringify({
        'topic': 'topic',
        'originator': 'originator',
        'timestamp': 'timestamp',
        'mime-type': 'mime-type',
        'payload': {
          'key1': 'val1',
          'key2': 'val2',
          'key3': 'val3',
          'key4': 'val4'
        }
      }), 'utf8')
    }
  }
]

// mock kafka message with invalid json
let badMessageSet = [
  {
    offset: 2,
    message: {
      value: Buffer.from('{ key: "value" }')
    }
  }
]

const topic = 'unit.test.topic.one'

const partition = 1

module.exports = {
  kafkaOptions,
  messageSet,
  badMessageSet,
  topic,
  partition
}
