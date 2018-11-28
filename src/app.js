/**
 * This is the top-level module of the application.
 */

console.log('**********')
console.log(process.env.LD_PRELOAD)
console.log(process.env.LLVM_INSTALL_PREFIX)
console.log('**********')

global.Promise = require('bluebird')
const healthcheck = require('topcoder-healthcheck-dropin')
const listener = require('./listener')

// bootstrap the listener
listener.bootstrap()

// initialize healthcheck dropin
healthcheck.init([ listener.generateIsConnected() ])

if (process.env.NODE_ENV === 'test') {
  module.exports = listener
}
