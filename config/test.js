/**
 * This module defines application configuration variables for the test environment.
 */

module.exports = {
  SLEEP_TIME: 20000,
  LOGGING_ON: true,
  MAX_CHECKS: 10, // max check times to wait job over with finished or error status
  JAVA_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/GuessRandom.java',
  CSHARP_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/GuessRandom.cs',
  CPP_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/GuessRandom.cpp',
  VERIFICATION_S3_URL: {
    java: 'https://s3.amazonaws.com/tc-development-bucket/java/verification.js',
    csharp: 'https://s3.amazonaws.com/tc-development-bucket/csharp/verification.js',
    cpp: 'https://s3.amazonaws.com/tc-development-bucket/cpp/verification.js'
  }
}
