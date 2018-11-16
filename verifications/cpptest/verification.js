const verification = (inputs, outputs, className, methods, submissionCode, callback) => {
  const result = Array.from(new Array(inputs.length), () => ({
    score: 0,
    executeTime: -1,
    memory: -1
  }))
  const signature = {
    input: methods[0].input,
    output: methods[0].output,
    className,
    method: methods[0].name
  }
  const inputData = inputs.map(x => ({
    input: x
  }))
  runCppScoring(signature, inputData, submissionCode).then((codeResult) => {
    if (codeResult.error) {
      result.map(x => {
        x.error = codeResult.error
        return x
      })
    } else if (codeResult.results && codeResult.results.length) {
      codeResult.results.forEach((val, index) => {
        if (val.error) {
          result[index].error = val.error
        } else {
          let x = val.output
          x = parseInt(x)
          if (isNaN(x) || signature.output === 'void') {
            x = parseInt(Math.random()*100)
          }
          let y = parseInt(x * Math.random())
          result[index].score = y > x ? 0 : 100 - x + y
          result[index].memory = val.statistics.memory
          result[index].executeTime = val.statistics.time
        }
      })
    }
    callback(result);
  }).catch(e => {
    result.map(x => {
      x.error = 'Error verifying submission: ' + e.message
      return x
    })
    callback(result)
  });
}

module.exports = verification

