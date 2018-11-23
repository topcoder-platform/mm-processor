const verification = (input, output, className, methods) => {
  let data = {
    score: 0,
    executeTime: -1,
    memory: -1
  }
  try {
    let random = java.newInstanceSync('java.util.Random')
    let y = random.nextIntSync(input[0]||100)
    let x = 0
    if (!methods[0].input || !methods[0].input.length) {
      x = java.callMethodSync(submission, methods[0].name)
    } else {
      const args = []
      methods[0].input.forEach((inputType) => {
        if (inputType === 'int[]') {
          args.push(java.newArray('int', input))
        } else if (inputType === 'double[]') {
          args.push(java.newArray('double', input))
        } else if (inputType === 'string[]') {
          args.push(java.newArray('java.lang.String', input))
        } else {
          args.push(input)
        }
      })
      x = java.callMethodSync(submission, methods[0].name, ...args)
    }
	x = parseInt(x)
    if (isNaN(x) || methods[0].output === 'void') {
      x = random.nextIntSync(y)
    }
    data.score = y > x ? 0 : 100 - x + y
  } catch (err) {
    console.error(err.stack)
    if (err && err.cause && java.instanceOf(err.cause, 'java.lang.OutOfMemoryError')) {
      throw err
    } else {
      data.error = 'Error verifying submission: ' + (err.cause ? err.cause.getMessageSync() : err.message)
    }
  }

  return data
}

module.exports = verification
