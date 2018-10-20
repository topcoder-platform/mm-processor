const verification = (input, output, className, methods) => {
  let data = {
    score: 0
  }
  
  try {
    let random = java.newInstanceSync('java.util.Random')
    let y = random.nextIntSync(input)
    let x = java.callMethodSync(submission, methods[0].name)
    data.score = y > x ? 0 : 100 - x + y
  } catch (err) {
    data.error = 'Error verifying submission: ' + JSON.stringify(err)
  }

  return data
}

 module.exports = verification
 