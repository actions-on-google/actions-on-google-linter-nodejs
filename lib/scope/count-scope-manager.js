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
 * counting metadata (i.e. # of Simple Responses in the given scope)
 */

'use strict';

const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {inspect} = require('util');
const last = require('lodash.last');
const {ScopeManager} = require('./scope-manager');
const {Scope} = require('./scope');
const assert = console.assert; // eslint-disable-line no-console

/**
 * Stores the counting metadata.
 */
class CountScopeManager extends ScopeManager {
  /**
   * Constructor.
   * @param {Object} eslintContext
   * @param {Function} repoterFn
   */
  constructor(eslintContext, repoterFn) {
    super(eslintContext, repoterFn);
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
      // temp hack to indicate that return statement is present and the count
      // should not be propagated to the top scope.
      Object.assign(this.currentScope(), {'hasReturnStatement': true});
    } else {
      this._enterScope(event);
    }
  }

  /**
   * Performs house-keeping operations depending on the node type during the
   * exit of the node during AST traversal.
   * @param {EslintNode} node
   * @private
   */
  _dispatchExit(node) {
    logger.debug(`Dispatching ${node.type}:exit. Scope stack =
      ${inspect(this._scopeStack)}. The corresponding code:
      ${this._eslintContext.getSourceCode().getText(node)}`);
    switch (node.type) {
      case 'IfStatement':
        this._handleIfExit(node);
        break;
      case 'CatchClause':
        this._handleCatchExit(node);
        break;
      default:
        this._exitScope();
        break;
    }
  }

  /**
   * Implementation of factory method for creationg of scope object.
   * Will auto-populate params with the following default values if missing:
   *  - metadata: 0
   *  - lastViolatingNode: null
   *  - hasReturnStatement: false
   * @param {Object} params
   * @return {Scope}
   * @private
   */
  _createScopeObject(params) {
    assert('event' in params);
    if (!('metadata' in params)) {
      params['metadata'] = 0;
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
   * metadata is calculated as a max(ifStatementConsequent.metadata,
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
    // 1. Adjust the values based on if-else logic
    const elseScope = this._getElseScopeIfAny(ifStatement);
    const ifScope = this.currentScope();
    this._exitScope();

    // metadata for the counter based on the child scopes.
    const initialVal = this.currentScope().metadata;
    let newVal = initialVal;

    if (this._isInsideIfElseStatement(ifStatement)) {
      newVal = Math.max(initialVal, Math.max(ifScope.metadata, elseScope ?
          elseScope.metadata : 0));
    } else {
      newVal += Math.max(ifScope.metadata, elseScope ?
          elseScope.metadata : 0);
    }
    Object.assign(this.currentScope(), {metadata: newVal});

    // 2. Report
    if (initialVal - this.currentScope().metadata !== 0) {
      Object.assign(this.currentScope(),
          {lastViolatingNode: ifStatement});
      this._reporterFn();
    }

    // 3. Undo scope changes from step #1 is there is a return statement
    this._undoChangesIfThereIsReturnStatement(ifScope, elseScope, initialVal);
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
   * Checks if ifStatementNode is inside of an else-statement (i.e.
   * if (a) ... else if (b) ...)
   * @param {EslintNode} ifStatementNode
   * @return {boolean}
   * @private
   */
  _isInsideIfElseStatement(ifStatementNode) {
    return last(this._eslintContext.getAncestors()).alternate ===
        ifStatementNode;
  }

  /**
   * Undoes the parent scope changes based on whether ifScope or elseScope has
   * return statement inside. If there is a return statement in ifScope,
   * then parent scope shouldn't get the counter from the ifScope going forward
   * in the AST traversal.
   *
   * @param {Scope} ifScope
   * @param {Scope} elseScope
   * @param {number} initialVal
   * @private
   */
  _undoChangesIfThereIsReturnStatement(ifScope, elseScope, initialVal) {
    // undo changes if return statement is there
    // ignore if return statement is present
    if (ifScope.hasReturnStatement && (elseScope &&
        elseScope.hasReturnStatement)) {
      Object.assign(this.currentScope(), {metadata: initialVal});
    } else if (ifScope.hasReturnStatement) {
      const ifScopeVal = ifScope ? ifScope.metadata : 0;
      const elseScopeVal = elseScope && !(elseScope.hasReturnStatement) ?
          elseScope.metadata : 0;
      Object.assign(this.currentScope(),
          {metadata: this.currentScope().metadata - ifScopeVal + elseScopeVal});
    } else if (elseScope && elseScope.hasReturnStatement) {
      const ifScopeVal = ifScope && !(ifScope.hasReturnStatement) ?
          ifScope.metadata : 0;
      const elseScopeVal = elseScope ? elseScope.metadata : 0;
      Object.assign(this.currentScope(),
          {metadata: this.currentScope().metadata - elseScopeVal + ifScopeVal});
    }
  }

  /**
   * Modifies the scope data during exit of an try-catch. It handles
   * following cases:
   *   - try { ... } catch (e) { ... }
   * The metadata passed from an if-statement goes to a parent scope. The
   * metadata is calculated as a max(tryStatement.metadata,
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
        {'metadata': Math.max(this.currentScope().metadata,
            Math.max(catchScope.metadata, tryScope.metadata))});
    this._reporterFn();
  }
}

module.exports.CountScopeManager = CountScopeManager;
