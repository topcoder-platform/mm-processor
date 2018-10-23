# Topcoder Submission - MM Processor

## Local Deployment

- install node dependencies
```
npm i
```

- start the application
```
npm start
```

## Testing

- unit tests
 * without coverage: `npm test`
 * with coverage: `npm run test:cov`

- e2e tests
 * without coverage: `npm run e2e`
 * with coverage: `npm run e2e:cov`

## Verification

- description of following describe in `README.md`, `Kafka Local Setup` section
 * setup local kafka server
 * create topic `submission.notification.create` as described in
 * start console producer on topic `submission.notification.create`

- after starting the kafka console producer, start the application

- enter the messages listed below in the kafka console producer and observe the application logs
 * marathon match challenge ids are from `https://api.topcoder-dev.com/v4/challenges?filter=subTrack=MARATHON_MATCH`
 * development challenge ids are from `https://api.topcoder-dev.com/v4/challenges?filter=subTrack=DEVELOPMENT`

- message (marathon match challenge - should log success)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457" } }
```

- message (marathon match challenge (with optional parameters) - should log success)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "http://fake.url.com", "fileType": "some file type", "isFileSubmission": true } }
```

- message (development challenge - should log ignoring)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "30015595", "memberId": "123457" } }
```

- message (marathon match challenge with filtered out originator - should log filtered out)
```
{ "topic": "submission.notification.create", "originator": "some-other-originator", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457"  } }
```

- message (marathon match challenge with filtered out resource - should log filtered out)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "some-other-resource", "id": "some-id", "challengeId": "16344", "memberId": "123457"  } }
```

- message (missing required keys (timestamp) - should log validation errors)
```
  { "topic": "submission.notification.create", "originator": "submission-api", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "http://fake.url.com", "fileType": "some file type", "isFileSubmission": true } }
```

## Verification for Java Score System

- Be sure to follow the steps in README.md to create AWS DynamoDB tables, S3 bucket, IAM user, and update the corresponding configurations
- Upload both files in `verifications/test` folder to the S3 bucket, and write down the S3 URL of the uploaded files (it should be something like `https://s3.amazonaws.com/<bucket name>/<file name>`)
- Add a new record into Verification table with the following values (this is in JSON format, but it should be very clear, if you still don't understand how to do it, please check AWS documentation):
```
{
    "id": "some random id, it does not matter",
    "challengeId": "16344",
    "className": "Random",
    "maxMemory": "64m",
    "inputs": [
      1,
      2,
      3
    ],
    "methods": [{
        "name": "guess",
        "input": [],
        "output": "int"
    }],
    "url": "S3 URL of verification.js"
}
```
- start the application
- send the following message, please replace url field with the correct S3 URL
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "https://s3.amazonaws.com/tc-development-bucket/Random.java", "fileType": "java", "isFileSubmission": true } }
```
- the message should be processed and you should see the new record in Job table, with the score, and the new folder created under `/src/java/job`
- try to send the same message multiple times, new job will be created for every message, the they may have different scores (because it is random)