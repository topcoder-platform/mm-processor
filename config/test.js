/**
 * This module defines application configuration variables for the test environment.
 */

module.exports = {
  SLEEP_TIME: 2000,
  LOGGING_ON: false,
  MAX_CHECKS: 10, // max check times to wait job over with finished or error status
  JAVA_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/Random.java',
  VERIFICATION_S3_URL: 'https://s3.amazonaws.com/tc-development-bucket/verification.js'
}
