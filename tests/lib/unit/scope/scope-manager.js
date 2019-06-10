/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Unit tests for .../js/lib/scope/scope-manager.js
 */

/* eslint require-jsdoc: 0 */
'use strict';

const {ScopeManager} =
    require('./../../../../lib/scope/scope-manager');
const {Scope} =
    require('./../../../../lib/scope/scope');
const {describe, it} = require('mocha');
const {expect} = require('chai');
// Okay to use vanilla JS object because that's how Eslint defines it.
// https://github.com/eslint/eslint/blob/219aecb78bc646d44bad27dc775a9b3d3dc58232/lib/linter/linter.js#L635
class MockContext {
  constructor(scope) {
    this._scope = scope;
  }
  getAncestors() { }
  getScope() {
    return this._scope;
  }
}

class MockScopeManager extends ScopeManager {
  _createScopeObject(params) {
    return new Scope(params);
  }
  account(node, event) {}
}

describe('ScopeManager', function() {
  it('#constructor', function() {
    const manager = new MockScopeManager(new MockContext(null), () => {
      return 0;
    });
    expect(manager._eslintContext).to.deep.equal(
        new MockContext(null), () => {});
    expect(manager._scopeStack).to.deep.equal([
      new Scope({
        event: 'Sentinel',
        lastViolatingNode: undefined,
        metadata: undefined,
        hasReturnStatement: undefined,
      })]);
    expect(manager._reporterFn()).to.equal(0);
  });
  it('#currentScope', function() {
    const manager = new MockScopeManager(new MockContext(null), () => {});
    expect(manager.currentScope()).to.deep.equal(new Scope({
      event: 'Sentinel',
      lastViolatingNode: undefined,
      metadata: undefined,
      hasReturnStatement: undefined,
    }));
    const fakeScope = new Scope({
      event: 'Foo',
      lastViolatingNode: null,
      metadata: 'abc',
      hasReturnStatement: false,
    });
    manager._scopeStack.push(fakeScope);
    expect(manager.currentScope()).to.deep.equal(fakeScope);
  });
  it('#_enterScope', function() {
    const manager = new MockScopeManager(new MockContext(null), () => {});
    manager._enterScope('TestEvent');
    expect(manager.currentScope()).to.deep.equal(
        new Scope({
          event: 'TestEvent',
        }));
    expect(manager._scopeStack.length).to.equal(2);
  });
  describe('#_exitScope', function() {
    it('normal flow', function() {
      const manager = new MockScopeManager(new MockContext(null), () => {});
      manager._enterScope('TestEvent');
      manager._exitScope();
      expect(manager.currentScope()).to.deep.equal(new Scope({
        event: 'Sentinel',
      }));
    });
    it('exiting Sentinel scope', function() {
      const manager = new MockScopeManager(new MockContext(null), () => {});
      expect(manager._exitScope).to.throw(Error);
    });
  });
});
