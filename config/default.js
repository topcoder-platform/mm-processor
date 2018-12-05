/**
 * This module defines application configuration variables.
 */

module.exports = {
  LOG_LEVEL: 'debug',
  KAFKA: {
    CONNECTION_STRING: process.env.CONNECTION_STRING || 'kafka-host:9092',
    GROUP_ID: process.env.GROUP_ID || 'tc-submission-mm-processor-group',
    HANDLER_CONCURRENCY: 1,
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
  AWS: {
    ACCESS_KEY_ID: process.env.ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY,
    REGION: process.env.REGION || 'us-east-1',
    JOB_TABLE_NAME: process.env.JOB_TABLE_NAME || 'Job',
    VERIFICATION_TABLE_NAME: process.env.VERIFICATION_TABLE_NAME || 'Verification'
  },
  STATISTICS: {
    JAVA: {
      CLASS_NAME: 'Statistics',
      CHECK_SIGNATURE: 'findMethod'
    },
    CSHARP: {
      CLASS_NAME: 'Verification',
      CHECK_SIGNATURE: 'VerifyClassAndMethod',
      RUN_METHOD: 'CallMethod'
    }
  },
  SUPPORTED_FILE_TYPES: {
    JAVA: '.java',
    CPP: '.cpp',
    CSHARP: '.cs'
  },
  TYPE_MAPPINGS: {
    cpp: {
      'int[]': 'vector<int>',
      'double[]': 'vector<double>',
      'string[]': 'vector<string>'
    }
  },
  CHALLENGE_INFO_API: process.env.CHALLENGE_INFO_API || 'https://api.topcoder-dev.com/v4/challenges?filter=id={cid}', // {cid} gets replaced with challenge id
  CHALLENGE_SUBTRACK: process.env.CHALLENGE_SUBTRACK || 'MARATHON_MATCH'
}
