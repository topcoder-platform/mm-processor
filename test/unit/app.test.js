/**
 * This module defines unit tests for the top-level module of the application.
 */

const proxyquire = require('proxyquire').noCallThru()
const { assert } = require('chai')
const sinon = require('sinon')

// mocked dependencies
const listenerStub = {
  bootstrap: sinon.stub(),
  generateIsConnected: () => { return 'is connected method' }
}
const healthcheckStub = {
  init: sinon.stub()
}

describe('The application', () => {
  beforeEach(() => {
    // restore mocked dependencies to initial state
    listenerStub.bootstrap.reset()
    healthcheckStub.init.reset()
    // run the unit under test
    proxyquire('../../src/app', {
      './listener': listenerStub,
      'topcoder-healthcheck-dropin': healthcheckStub
    })
  })
  it('Should bootstrap the listener', () => {
    assert(listenerStub.bootstrap.calledOnce, 'app bootstraps listener')
  })
  it('Should initialize topcoder healthcheck dropin with isConnected method of listener', () => {
    assert(healthcheckStub.init.calledOnceWithExactly([ 'is connected method' ]), 'healthcheck dropin initialized with listener.isConnected')
  })
})
