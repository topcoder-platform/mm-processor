/**
 * This module defines configuration variables for Java submissions.
 */

module.exports = {
  AWS: {
    ACCESS_KEY_ID: process.env.ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.SECRET_ACCESS_KEY,
    REGION: process.env.REGION || 'us-east-1',
    JOB_TABLE_NAME: process.env.JOB_TABLE_NAME || 'Job',
    VERIFICATION_TABLE_NAME: process.env.VERIFICATION_TABLE_NAME || 'Verification'
  }
}
