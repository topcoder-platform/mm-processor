score = null
error = null

let random = java.newInstanceSync('java.util.Random')

let submission = null
try {
  submission = java.newInstanceSync(className)
} catch (err) {
  error = 'Expected class Random cannot be found'
}

let total = 0
if (!error) {
  try {
    inputs.forEach(function(input) {
      let y = random.nextIntSync(input)
      let x = submission[methods[0].name + 'Sync']()
      total += y > x ? 0 : 100 - x + y
    });
  } catch (err) {
    error = 'Expected method guess cannot be found'
  }
}

if (!error) {
  score = total / inputs.length
}
