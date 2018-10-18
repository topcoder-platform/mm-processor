score = null
error = null

let random = java.newInstanceSync('java.util.Random')

let submission = null
try {
  submission = java.newInstanceSync(verification.className)
} catch (err) {
  error = 'Expected class Random cannot be found'
}

let total = 0
if (!error) {
  try {
    for (let i = 1; i <= 3; i++) {
      let y = random.nextIntSync(i)
      let x = submission[verification.methods[0].name + 'Sync']()
      total += y > x ? 0 : 100 - x + y
    }
  } catch (err) {
    error = 'Expected method guess cannot be found'
  }
}

if (!error) {
  score = total / 3.0
}
