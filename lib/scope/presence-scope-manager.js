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
 * @fileoverview File containing implementation of scope manager that stores the
 * presence metadata of an item that we care about
 * (i.e. is SimpleResponse called in the given scope).
 */

'use strict';

const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {inspect} = require('util');
const {ScopeManager} = require('./scope-manager');
const {Scope} = require('./scope');

/**
 * Implementation of Scope Manager that keeps track of metadata about presence
 * of a node in scope.
 */
class PresenceScopeManager extends ScopeManager {
  /**
   * Constructor.
   * @param {Object} eslintContext
   * @param {Function} reporterFn
   */
  constructor(eslintContext, reporterFn) {
    super(eslintContext, reporterFn);
  }

  /**
   * Accounts for the node being traversed.
   * Abstract method.
   * @param {EslintNode} node currently traversed
   * @param {string} event emitted by Eslint during traversal of the node
   */
  account(node, event) {
    if (event.includes(':exit')) {
      this._dispatchExit(node);
    } else if (event === 'ReturnStatement') {
      // temp hack to indicate that return statement is present and the cnt
      // should not be propagated to the top scope.
      Object.assign(this.currentScope(), {'hasReturnStatement': true});
    } else {
      this._enterScope(event);
    }
  }

  /**
   * Method that checks if scope is inside of the intent handler.
   * @param {Scope} scope
   * @return {bool} if scope is inside of intent handler.
   */
  isScopeInsideIntent(scope) {
    if (!this._scopeStack || this._scopeStack.length === 0) {
      return false;
    }
    const pos = this._scopeStack.indexOf(scope);
    if (pos == -1) {
      throw new Error(`${inspect(scope)} is not in the scope stack,
       but should be.`);
    }
    return this._scopeStack.slice(0, pos + 1).filter((x) =>
      x.event.includes('Intent')).length > 0;
  }

  /**
   * Implementation of factory method for creationg of scope object.
   * Will auto-populate params with the following default values if missing:
   *  - metadata: is the currently traversed node not inside an intent
   *  - lastViolatingNode: null
   *  - hasReturnStatement: false
   * @param {Object} params
   * @return {Scope}
   * @private
   */
  _createScopeObject(params) {
    if (!('metadata' in params)) {
      const isInsideIntent = this.isScopeInsideIntent(this.currentScope()) ||
          params.event.includes('Intent');
      params['metadata'] = !isInsideIntent;
    }
    if (!('lastViolatingNode' in params)) {
      params['lastViolatingNode'] = null;
    }
    if (!('hasReturnStatement' in params)) {
      params['hasReturnStatement'] = false;
    }
    return new Scope(params);
  }

  /**
   * Modifies the scope data during exit of an if-statement. It handles
   * following cases:
   *   - if (a) { ... }
   *   - if (a) { ... } else { ... }
   *   - if (a) { ... } else if { ... }
   * The metadata passed from an if-statement goes to a parent scope. The
   * metadata is calculated as a (ifStatementConsequent.metadata &&
   * ifStatementAlternate.metadata).
   * @param {EslintNode} ifStatement
   * @private
   */
  _handleIfExit(ifStatement) {
    // This happens when we don't push IfStatement on the scope stack. This
    // means rule doesn't need to keep track of data in that case.
    if (!this.currentScope().event.includes('IfStatement')) {
      logger.debug(`In IfStatement:exit, but the scope looks:
       ${inspect(this._scopeStack)}`);
      return;
    }
    const elseScope = this._getElseScopeIfAny(ifStatement);
    const ifScope = this.currentScope();
    this._exitScope();
    Object.assign(this.currentScope(),
        {metadata: this.currentScope().metadata ||
              (ifScope.metadata && elseScope ? elseScope.metadata : false)});
  }

  /**
   * Helper method to get the scope corresponding to ifStatementNode.alternate.
   *
   * @param {EslintNode} ifStatementNode
   * @return {Scope|undefined}
   * @private
   */
  _getElseScopeIfAny(ifStatementNode) {
    let elseScope;
    // means if-else encountered
    if (ifStatementNode.alternate && this.currentScope() &&
        this.currentScope().event.includes('IfStatement')) {
      elseScope = this.currentScope();
      this._exitScope();
    }
    return elseScope;
  }

  /**
   * Modifies the scope data during exit of an try-catch. It handles
   * following cases:
   *   - try { ... } catch (e) { ... }
   * The metadata passed from an if-statement goes to a parent scope. The
   * metadata is calculated as a (tryStatement.metadata &&
   * catchStatement.metadata).
   * @param {EslintNode} node
   * @private
   */
  _handleCatchExit(node) {
    // figure out try and catch configurations.
    if (!this.currentScope().event.includes('CatchClause')) {
      throw new Error(`Expected Catch to be on top of stack, but
       found ${this.currentScope().event}`);
    }
    const catchScope = this.currentScope();
    this._exitScope();
    if (!this.currentScope().event.includes('TryStatement')) {
      throw new Error(`Expected TryStatement to be on top of stack, but
       found ${this.currentScope().event}`);
    }
    const tryScope = this.currentScope();
    this._exitScope();
    Object.assign(this.currentScope(),
        {'metadata': this.currentScope().metadata ||
              (catchScope.metadata && tryScope.metadata)});
  }

  /**
   * Handles the exit of a potential intent handler. If it's an intent handler,
   * will call a reporterFn.
   * @param {EslintNode} potentialIntentHandlerNode
   * @private
   */
  _handleIntentHandlerExit(potentialIntentHandlerNode) {
    if (this.currentScope().event.includes('Intent')) {
      this._reporterFn(potentialIntentHandlerNode);
    }
    super._exitScope();
  }

  /**
   * Performs house-keeping operations depending on the node type during the
   * exit of the node during AST traversal.
   * @param {EslintNode} node
   * @private
   */
  _dispatchExit(node) {
    switch (node.type) {
      case 'IfStatement':
        this._handleIfExit(node);
        break;
      case 'CatchClause':
        this._handleCatchExit(node);
        break;
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
      case 'FunctionDeclaration':
      case 'MethodDefinition':
        this._handleIntentHandlerExit(node);
        break;
      default:
        super._exitScope(node);
        break;
    }
  }
}

module.exports.PresenceScopeManager = PresenceScopeManager;
