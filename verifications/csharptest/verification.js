module.exports = (input, output, className, methods) => {
  let data = {
    score: 0
  }

  try {
    const randomMethod = edge.func(`
      async (input) => {
        return new System.Random().Next(100);
      }
    `)
    let y = randomMethod(null, true)

    const params = {
      className,
      name: methods[0].name,
      input: methods[0].input,
      value: null
    }

    let result = callMethod(params, true)

    data.score = y > result.result ? 0 : 100 - result.result + y
    data.executeTime = result.executionTime
    data.memory = result.memoryUsage
  } catch (err) {
    data.executeTime = -1
    data.memory = -1
    data.error = 'Error verifying submission: ' + (err.message ? err.message : err)
  }

  return data
}
