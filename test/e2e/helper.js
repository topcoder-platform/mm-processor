/**
 * This module provides test helper functionality.
 */

async function sleep (time) {
  await new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}

// S3 url pattern
const s3UrlPattern = /^https:\/\/(.*)\.?s3\.amazonaws\.com\/(.+)$/

/**
 * Get the path to download an object from S3.
 * @param {string} url the URL of the S3 object.
 * @returns {Array} an array of strings of the bucket name, key.
 */
function parseS3Url (url) {
  const matches = s3UrlPattern.exec(url)
  if (matches === null) {
    return
  }
  let bucketName = matches[1]
  let key = matches[2]
  if (bucketName.length === 0) {
    bucketName = key.substring(0, key.indexOf('/'))
    key = key.substring(key.indexOf('/') + 1)
  }
  return [bucketName, key]
}
module.exports = {
  sleep,
  parseS3Url
}
