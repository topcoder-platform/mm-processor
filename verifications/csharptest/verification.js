module.exports = (input, output, className, methods) => {
  let data = {
    score: 0
  }

  try {
    const randomMethod = edge.func(`
      async (input) => {
        return new System.Random().Next((int)input);
      }
    `)
    let y = randomMethod(100, true)

    const params = {
      className,
      name: methods[0].name,
      input: methods[0].input,
      value: input // call with input values
    }
    let result = callMethod(params, true)
    let x = result.result
    x = parseInt(x)
    if (isNaN(x) || methods[0].output === 'void') {
       x = randomMethod(y, true)
    }
    data.score = y > x ? 0 : 100 - x + y
    data.executeTime = result.executionTime
    data.memory = result.memoryUsage
  } catch (err) {
    console.error(err.stack)
    data.executeTime = -1
    data.memory = -1
    data.error = 'Error verifying submission: ' + (err.message ? err.message : err)
  }

  return data
}