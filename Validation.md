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
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344" } }
```

- message (marathon match challenge (with optional parameters) - should log success)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "url": "http://fake.url.com", "fileType": "some file type", "isFileSubmission": true } }
```

- message (development challenge - should log ignoring)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "30015595" } }
```

- message (marathon match challenge with filtered out originator - should log filtered out)
```
{ "topic": "submission.notification.create", "originator": "some-other-originator", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344" } }
```

- message (marathon match challenge with filtered out resource - should log filtered out)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-10-03T16:36:57.524Z", "mime-type": "some mime-type", "payload": { "resource": "some-other-resource", "id": "some-id", "challengeId": "16344" } }
```

- message (missing required keys (timestamp) - should log validation errors)
```
{ "topic": "submission.notification.create", "originator": "submission-api", "mime-type": "some mime-type", "payload": { "resource": "submission", "id": "some-id", "challengeId": "16344", "url": "http://fake.url.com", "fileType": "some file type", "isFileSubmission": true } }
```
