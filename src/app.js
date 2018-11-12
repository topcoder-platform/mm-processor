/**
 * This is the top-level module of the application.
 */

global.Promise = require('bluebird')
const healthcheck = require('topcoder-healthcheck-dropin')
const listener = require('./listener')

// bootstrap the listener
listener.bootstrap()

// initialize healthcheck dropin
healthcheck.init([ listener.generateIsConnected() ])
