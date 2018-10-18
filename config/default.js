/**
 * This module defines application configuration variables.
 */

module.exports = {
  LOG_LEVEL: 'debug',
  KAFKA: {
    CONNECTION_STRING: process.env.KAFKA_CONN_STRING || '127.0.0.1:9092',
    GROUP_ID: 'tc-submission-mm-processor-group',
    HANDLER_CONCURRENCY: 10,
    SSL: {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT
    },
    TOPIC: 'submission.notification.create',
    FILTER: {
      TOPIC: 'submission.notification.create',
      ORIGINATOR: 'submission-api',
      RESOURCES: [
        'submission',
        'review'
      ]
    }
  },
  CHALLENGE_INFO_API: 'https://api.topcoder-dev.com/v4/challenges?filter=id={cid}', // {cid} gets replaced with challenge id
  CHALLENGE_SUBTRACK: 'MARATHON_MATCH'
}
