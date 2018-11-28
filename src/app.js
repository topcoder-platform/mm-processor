/**
 * This is the top-level module of the application.
 */

const testFolder = '/mm-processor/node_modules/cpp-mm-scoring/.sources/';
const fs = require('fs');

console.log('*********');
fs.readdirSync(testFolder).forEach(file => {
  console.log(file);
})
console.log('*********');

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
