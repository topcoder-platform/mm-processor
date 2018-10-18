# Topcoder Submission - MM Processor

## Development Environment

- Ubuntu 16.04

- node v8.11.1

- npm 5.6.0

## Configuration

- `config/default.js`
 * `LOG_LEVEL`: string - the log level
 * `KAFKA`: object - kafka configurations
  - `CONNECTION_STRING`: string - connection string for the kafka broker
  - `GROUP_ID`: string - consumer group id
  - `HANDLER_CONCURRENCY`: positive integer - maximum number of concurrent data handlers for kafka messages
  - `SSL`: object - ssl configuration object (optional)
   * `CERT`: string - ssl certificate
   * `KEY`: string - ssl key
  - `TOPIC`: string - kafka topic to listen to
  - `FILTER`: object - object used to filter kafka messages
   * `TOPIC`: string - required topic to pass filter
   * `ORIGINATOR`: string - required originator to pass filter
   * `RESOURCE`: string[] - required resource to pass filter
 * `CHALLENGE_INFO_API`: string - challenge info api url for getting challenge details (`{cid}` is replaced with challenge id)
 * `CHALLENGE_SUBTRACK`: string - the challenge subtrack to process

- `config/test.js`
 * `SLEEP_TIME`: positive integer - the time in milliseconds to sleep between producing messages and checking there response in e2e tests
 * `LOGGING_ON`: boolean - turn logging on during e2e testing (helpful for debugging tests)

- `src/java/config/default.js`
 * `AWS`: object - AWS related configurations
  - `ACCESS_KEY_ID`: string - the AWS access key id
  - `SECRET_ACCESS_KEY`: string - the AWS secret access key
  - `REGION`: string - the AWS region
  - `JOB_TABLE_NAME`: string - the DynamoDB table name for job records
  - `VERIFICATION_TABLE_NAME`: string - the DynamoDB table name for verification records

## Kafka Local Setup

- quickstart link (see summary below)
 * http://kafka.apache.org/quickstart

- list of download links for latest version
 * https://www.apache.org/dyn/closer.cgi?path=/kafka/1.1.0/kafka_2.11-1.1.0.tgz

- requirements
 * java 8 (recommended latest jdk 1.8 - older versions have known security vulnerabilities)

- os notes
 * http://kafka.apache.org/documentation/#OS
 * kafka is tested on linux and solaris
 * windows is not currently a well supported platform

- quickstart
 * assumes no existing kafka or zookeeper (hosts kafka server) data
 * download kafka (link to a list of download links above)
 * extract `tar -xzf kafka_2.11-1.1.0.tgz` (replace `kafka_2.11-1.1.0.tgz` with your download)
 * move into extracted folder `cd kafka_2.11-1.1.0`
 * all of the following commands will assume you are in the extracted folder
 * for windows, replace `bin/` with `bin\windows\` and replace script extensions with `.bat`
 * commands (these commands assume you are in the extracted folder from the kafka download)
  - start zookeeper server (needs to be done before starting kafka server)
   * `bin/zookeeper-server-start.sh config/zookeeper.properties`
  - start kafka server
   * `bin/kafka-server-start.sh config/server.properties`
  - create topic named `submission.notification.create`
   * `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic submission.notification.create`
  - list topics
   * `bin/kafka-topics.sh --list --zookeeper localhost:2181`
  - start console producer to interactively send messages to the topic `submission.notification.create`
   * `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic submission.notification.create`
  - start console consumer to interactively listen for messages on topic `submission.notification.create`
   * `bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic submission.notification.create --from-beginning`

## AWS setup

 - create DynamoDB tables
  * open AWS console and go to DynamoDB
  * create a table named Job (or whatever name you want it to be, but you need to change the configuration, see above). the hash key need to be id and its type is string. keep default value for other settings
  * create another table named Verification (or whatever name you want it to be, but you need to change the configuration, see above). the hash key need to be id and its type is string. keep default value for other settings
 - create S3 bucket
  * open AWS console and go to S3
  * create a new bucket
 - create IAM user
  * open AWS console and go to IAM
  * create a new user
  * go to security credentials tab, and click `Create access key` button
  * in the popup, click to show the secret access key, and write it down (this is the only change you can ever see it)
  * go to permissions tab, click `Add permissions` button
  * to be simple, you can attach administrator access to the user, or you can fine tune the permission to only access the DynamoDB tables and S3 bucket, but you need to make sure you have permission to put and update Job table, scan Verification table, and list and getObject permission to the S3 bucket
  * update the configuration in `src/java/config/default.js` and put all the values you created or retrieved

## E2E Tests

- tests use actual kafka broker
 * either configured in `config/test.js` if present or `default.js` otherwise
 * if tests failing, it may be because `config/test.js#SLEEP_TIME` needs to be increased to allow messages to get processed
 * tests use https://api.topcoder-dev.com/v4/challenges?filter=subTrack=MARATHON_MATCH to get challenge id's for marathon matches
 * tests use https://api.topcoder-dev.com/v4/challenges?filter=subTrack=DEVELOPMENT to get challenge id's for the development challenges


## Topcoder Healthcheck Dropin

- https://www.npmjs.com/package/topcoder-healthcheck-dropin

- healthcheck dropin express server listens on `process.env.PORT` if set or defaults to 3000 otherwise

## Local Deployment

- install node dependencies
```
npm i
```

- start application
```
npm start
```

## Linting

- lint codebase (standard linter)
```
npm run lint
```

- lint codebase and fix
```
npm run lint:fix
```

## Testing

- unit tests
 * without coverage: `npm test`
 * with coverage: `npm run test:cov`

- e2e tests
 * without coverage: `npm run e2e`
 * with coverage: `npm run e2e:cov`
