/**
 * This module provides test helper functionality.
 */

async function sleep (time) {
  await new Promise((resolve, reject) => {
    setTimeout(resolve, time)
  })
}

module.exports = {
  sleep
}
