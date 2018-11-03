const verification = (input, output, className, methods) => {
  let data = {
    score: 0,
    executeTime: -1,
    memory: -1
  }
  if (methods[0].name === 'testArrayOfString') {
    data.error = 'error in verification.js' // test error in verification.js
    return data
  }
  try {
    let random = java.newInstanceSync('java.util.Random')
    let y = random.nextIntSync(input[0])
    let x = java.callMethodSync(submission, methods[0].name) // wrong usage if pass inputs but keep old codes here
    data.score = y > x ? 0 : 100 - x + y
  } catch (err) {
    data.error = 'Error verifying submission: ' + (err.cause ? err.cause.getMessageSync() : err.message)
  }

  return data
}

module.exports = verification
