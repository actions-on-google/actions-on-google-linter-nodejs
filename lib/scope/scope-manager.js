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
 * @fileoverview File containing the class for scope manager base class.
 */

'use strict';

const last = require('lodash.last');

/**
 * Abstract class responsible for managing scope. ScopeManager helps
 * linter manage metadata across scopes coming from if-statements, try-catch
 * etc. Concrete scope managers will implement "account" method to keep track
 * of a particular metadata, such as # of Simple Responses in the scope, or
 * whether a certain value is set in the current scope.
 */
class ScopeManager {
  /**
   * Initializes properties for a scope manager.
   * @param {Object} eslintContext
   * @param {Function} reporterFn callback function that will report violations
   * to developer.
   */
  constructor(eslintContext, reporterFn) {
    this._eslintContext = eslintContext;
    this._scopeStack = [this._createScopeObject({event: 'Sentinel'})];
    this._reporterFn = reporterFn;
  }

  /**
   * Returns the current scope.
   * @return {Scope} current scope
   */
  currentScope() {
    return last(this._scopeStack);
  }

  /**
   * Accounts for the node being traversed.
   * Abstract method.
   * @param {EslintNode} node currently traversed
   * @param {string} event emitted by Eslint during traversal of the node
   */
  account(node, event) {
    throw new Error('Override this class and implement the method.');
  }

  /**
   * Performs housekeeping actions during the entrance of new scope.
   *
   * @param {string} event emitted by Eslint during traversal of the node
   * @private
   */
  _enterScope(event) {
    this._scopeStack.push(this._createScopeObject({'event': event}));
  }

  /**
   * Checks invariants for the state of scope manager.
   * @private
   */
  _invariant() {
    if (!this.currentScope() || this.currentScope().event === 'Sentinel') {
      throw new Error(`${this.currentScope()} is about to be popped`);
    }
  }

  /**
   * Performs housekeeping actions during the exit of the scope.
   *
   * Various things need to be done when exiting the scope depending on the type
   * of Scope Manager. Please be sure to implement the behavior you want in
   * the subclasses.
   * @private
   */
  _exitScope() {
    this._invariant();
    this._scopeStack.pop();
  }

  /**
   * Factory method for the scope object. Each scope manager will have a
   * different kind of scope to manage, so this should be implemented in
   * the subclasses.
   *
   * Implementation will create Scope using keys in params. For absent keys,
   * it will populate with default values for the Scope.
   * @param {Object} params eslint event
   * @private
   */
  _createScopeObject(params) {
    throw new Error('Override this class and implement the method.');
  }
}

module.exports.ScopeManager = ScopeManager;
