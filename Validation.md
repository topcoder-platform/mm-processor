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
- Upload both files in `verifications/javatest` folder to the S3 bucket, and write down the S3 URL of the uploaded files (it should be something like `https://s3.amazonaws.com/<bucket name>/<folders>/<file name>`)
- Add a new record into Verification table with the following values (this is in JSON format, but it should be very clear, if you still don't understand how to do it, please check AWS documentation):
```
{
    "id": "some random id, it does not matter",
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "64m",
    "inputs": [
      [1],
      [2],
      [3]
    ],
    "methods": [{
        "name": "guess",
        "input": [],
        "output": "int"
    }],
    "url": {
       "cpp": "<an url with the verification.js for C++ code >",
       "java": "<an url with the verification.js for Java code>",
       "csharp": "<an url with the verification.js for C# code>"
    }
}
```
- start the application
- send the following message, please replace url field with the correct S3 URL
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "https://s3.amazonaws.com/tc-development-bucket/java/GuessRandom.java", "fileType": "java", "isFileSubmission": true } }
```
- the message should be processed and you should see the new record in Job table, with the score, and the new folder created under `/src/java/job`
- try to send the same message multiple times, new job will be created for every message, the they may have different scores (because it is random)

## Verification for C# Score System

- Be sure to follow the steps in README.md to create AWS DynamoDB tables, S3 bucket, IAM user, and update the corresponding configurations
- Upload both files in `verifications/csharptest` folder to the S3 bucket, and write down the S3 URL of the uploaded files (it should be something like `https://s3.amazonaws.com/<bucket name>/<folder>/<file name>`)
- Add a new record into Verification table with the following values (this is in JSON format, but it should be very clear, if you still don't understand how to do it, please check AWS documentation):
```
{
    "id": "some random id, it does not matter",
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "64m",
    "inputs": [
      [1],
      [2],
      [3]
    ],
    "methods": [{
        "name": "guess",
        "input": [],
        "output": "int"
    }],
    "url": {
      "csharp": "S3 URL of verification.js"
    }
}
```
- start the application
- send the following message, please replace url field with the correct S3 URL
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "https://s3.amazonaws.com/tc-development-bucket/csharp/GuessRandom.cs", "fileType": "cs", "isFileSubmission": true } }
```
- the message should be processed and you should see the new record in Job table, with the score, and the new folder created under `/src/csharp/job`
- try to send the same message multiple times, new job will be created for every message, the they may have different scores (because it is random)

If you want to test Out Of Memory exception for java
Please use such Verification record(change maxMemory and method name)
```
{
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "6m",
    "inputs": [
      [1],
      [2],
      [3]
    ],
    "methods": [{
        "name": "testOOM",
        "input": [],
        "output": "int"
    }],
    "url": {
       "java": "S3 URL of verifications/java/verification.js"
    }
}
```
Follow same step then you will get such result
```
{
  "challengeId": "16344",
  "createdOn": "2018-10-28T12:37:49.695Z",
  "id": "3181b60c-c9da-49dc-8717-2b73579c5fdd",
  "memberId": "123457",
  "results": [
    {
      "error": "OutOfMemoryError happened with max memory=6m",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    },
    {
      "error": "OutOfMemoryError happened with max memory=6m",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    },
    {
      "error": "OutOfMemoryError happened with max memory=6m",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    }
  ],
  "status": "Finished",
  "submissionId": "some-id",
  "updatedOn": "2018-10-28T12:38:02.563Z"
}
```

If you want to test memory/executeTime for java in method
Please use such Verification record
```
{
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "64m",
    "inputs": [
      [1],
      [2],
      [3]
    ],
    "methods": [{
        "name": "testOOM",
        "input": [],
        "output": "int"
    }],
    "url": {
         "java": "S3 URL of verifications/java/verification.js"
     }
}
```

Follow same step then you will get such result
```
{
  "challengeId": "16344",
  "createdOn": "2018-10-28T12:36:13.241Z",
  "id": "6c2de186-c7a4-4781-abcc-d4e087f4b444",
  "memberId": "123457",
  "results": [
    {
      "executeTime": 1010,
      "memory": 10177,
      "score": 48
    },
    {
      "executeTime": 1009,
      "memory": 10177,
      "score": 49
    },
    {
      "executeTime": 1009,
      "memory": 10177,
      "score": 50
    }
  ],
  "status": "Finished",
  "submissionId": "some-id",
  "updatedOn": "2018-10-28T12:36:29.728Z"
}
```

send the following message to test cpp processor, please replace url field with the correct S3 URL
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "memberId": "123457", "url": "https://s3.amazonaws.com/tc-development-bucket/cpp/GuessRandom.cpp", "fileType": "cpp", "isFileSubmission": true } }
```

If you want to test memory/executeTime for cpp in method
Please use such Verification record
```
{
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "64m",
    "inputs": [
      [[1,2]],
      [[21,22]],
      [[11,12]]
    ],
    "methods": [{
        "name": "testArrayOfInt",
        "input": ["int[]"],
        "output": "int"
    }],
    "url": {
         "cpp": "S3 URL of verifications/cpp/verification.js"
     }
}
```

Follow same step then you will get such result
```
{
  "challengeId": "16344",
  "createdOn": "2018-11-16T13:03:16.793Z",
  "id": "e13ebfef-e89c-48fb-bc23-65a2e5de9089",
  "memberId": "123457",
  "results": [
    {
      "executeTime": 0.003,
      "memory": 18576,
      "score": 98
    },
    {
      "executeTime": 0.004,
      "memory": 19096,
      "score": 80
    },
    {
      "executeTime": 0.004,
      "memory": 19360,
      "score": 84
    }
  ],
  "status": "Finished",
  "submissionId": "some-id",
  "updatedOn": "2018-11-16T13:03:53.797Z"
}
```

If you want to test error for cpp in method
Please use such Verification record
```
{
    "challengeId": "16344",
    "className": "GuessRandom",
    "maxMemory": "64m",
    "inputs": [
      [],
      [],
      []
    ],
    "methods": [{
        "name": "testError",
        "input": [],
        "output": "int"
    }],
    "url": {
         "cpp": "S3 URL of verifications/cpp/verification.js"
     }
}
```

Follow same step then you will get such result
```
{
  "challengeId": "16344",
  "createdOn": "2018-11-16T13:05:36.336Z",
  "id": "d21e1a50-7a36-4511-a5de-0d011d3ca7ec",
  "memberId": "123457",
  "results": [
    {
      "error": "Runtime error: Error in method of verification",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    },
    {
      "error": "Runtime error: Error in method of verification",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    },
    {
      "error": "Runtime error: Error in method of verification",
      "executeTime": -1,
      "memory": -1,
      "score": 0
    }
  ],
  "status": "Finished",
  "submissionId": "some-id",
  "updatedOn": "2018-11-16T13:05:54.390Z"
}
```