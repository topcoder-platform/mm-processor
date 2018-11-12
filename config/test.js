/**
 * This module defines application configuration variables for the test environment.
 */

module.exports = {
  SLEEP_TIME: 8000,
  LOGGING_ON: true,
  SUBMISSION_BUCKET_NAME: 'bucket',
  MAX_CHECKS: 10, // max check times to wait job over with finished or error status
  JAVA_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/GuessRandom.java',
  CSHARP_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/GuessRandom.cs',
  VERIFICATION_S3_URL: {
    java: 'https://s3.amazonaws.com/tc-development-bucket/java/verification.js',
    csharp: 'https://s3.amazonaws.com/tc-development-bucket/csharp/verification.js'
  }
}
