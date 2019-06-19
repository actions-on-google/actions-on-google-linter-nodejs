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

const espree = require('espree');
const eslintScope = require('eslint-scope');

const {PresenceScopeManager} =
    require('../../../../lib/scope/presence-scope-manager');
const {describe, it} = require('mocha');
const {expect} = require('chai');
const assert = console.assert; // eslint-disable-line no-console
const last = require('lodash.last');
// Okay to use vanilla JS object because that's how Eslint defines it.
// https://github.com/eslint/eslint/blob/219aecb78bc646d44bad27dc775a9b3d3dc58232/lib/linter/linter.js#L635
class MockContext {
  constructor(scopeList) {
    this._scopeList = scopeList;
    this._ancestors = [];
  }
  addScope(scope) {
    this._scopeList.push(scope);
  }
  getAncestors() {
    return this._ancestors; // needs to set ancestors at runtime
  }
  getScope() {
    return last(this._scopeList);
  }
  getSourceCode() {
    return {
      getText() {
        return '';
      },
    };
  }
}

const DEFAULT_ESPREE_CONFIG = {
  ecmaVersion: 8,
  // need to specify module; otherwise, parse doesn't resolve variables
  sourceType: 'module',
  // create a top-level tokens array containing all tokens
  tokens: true,
  comment: true,
  loc: true,
  range: true,
};

// NOTE: It's important to set appropriate ancestor and scope information
// in the tests. We have to do it artificially here, but Eslint does this
// automatically at runtime.
describe('ScopeManager', function() {
  function createMockContext(scopeList) {
    return new MockContext(
        scopeList
    );
  }

  /*
   * Must be of form:
   *   app.intent('a', conv => {
   *
   *   });
   * Note, function can be either lambda or vanilla.
   */
  function getScopeManagerForIntentHandler(ast) {
    const scopeManager = eslintScope.analyze(ast, DEFAULT_ESPREE_CONFIG);
    const globalScope = scopeManager.acquire(ast, DEFAULT_ESPREE_CONFIG);
    const intentHandlerScope = scopeManager.acquire(
        ast.body[0].expression.arguments[1], // lambda scope
        DEFAULT_ESPREE_CONFIG);
    const context = createMockContext([globalScope, intentHandlerScope]);
    const manager = new PresenceScopeManager(context, () => {
      return 0;
    });
    return manager;
  }

  describe('#account', function() {
    describe('Enter scope', function() {
      it('ArrowFunctionExpression', function() {
        const code = `
      app.intent('test', conv => {
        conv.ask('hello world');
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        manager.account(ast.body[0].expression.arguments[1],
            'ArrowFunctionExpression, Intent');
        expect(manager._scopeStack).to.deep.equal([
          manager._createScopeObject({event: 'Sentinel', metadata: true}),
          manager._createScopeObject(
              {event: 'ArrowFunctionExpression, Intent', metadata: false}),
        ]);
      });
      it('FunctionHandler with IfStatements', function() {
        const code = `
      function handler(conv) {
        if (a) {
          conv.ask('foo');
        } else {
          conv.ask('bar');
        }
      }
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const scopeManager = eslintScope.analyze(ast, DEFAULT_ESPREE_CONFIG);
        const globalScope = scopeManager.acquire(ast, DEFAULT_ESPREE_CONFIG);
        const funcScope = scopeManager.acquire(
            ast.body[0], // func scope
            DEFAULT_ESPREE_CONFIG);
        assert(funcScope);
        const context = createMockContext([globalScope, funcScope]);
        const manager = new PresenceScopeManager(context, () => {
          return 0;
        });
        const ifStmt = ast.body[0].body.body[0];
        assert(ifStmt.type === 'IfStatement');
        // traverse body of if-statement's consequent
        manager.account(
            ifStmt.consequent.body[0].expression, // conv.ask('foo');
            'IfStatement > BlockStatement');
        expect(manager._scopeStack).to.deep.equal([
          manager._createScopeObject({event: 'Sentinel', metadata: true}),
          manager._createScopeObject({event: 'IfStatement > BlockStatement',
            metadata: true}),
        ]);
        manager.account(
            ifStmt.alternate.body[0].expression, // conv.ask('bar');
            'IfStatement > BlockStatement'
        );
        expect(manager._scopeStack).to.deep.equal([
          manager._createScopeObject({event: 'Sentinel', metadata: true}),
          manager._createScopeObject({event: 'IfStatement > BlockStatement',
            metadata: true}),
          manager._createScopeObject({event: 'IfStatement > BlockStatement',
            metadata: true}),
        ]);
      });
    });
    describe('Exit scope', function() {
      it('ArrowFunctionExpression', function() {
        const code = `
      app.intent('test', conv => {
        conv.ask('hello world');
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        manager.account(ast.body[0].expression.arguments[1], // lambda func
            'ArrowFunctionExpression, Intent');
        // the rule implementation will typically update the scope metadata
        // based on whatever it keeps track of
        assert(manager.currentScope().metadata === false);
        // account for conv.ask in the body
        Object.assign(manager.currentScope(), {metadata: true});
        manager._eslintContext._ancestors = [ast];
        manager.account(ast.body[0].expression.arguments[1],
            'ArrowFunctionExpression:exit, Intent');
        // the counter doesn't propagate back to parent scope
        expect(manager._scopeStack).to.deep.equal([
          manager._createScopeObject({event: 'Sentinel', metadata: true}),
        ]);
      });
      it('IfStatement (if-else)', function() {
        const code = `
      app.intent('test', conv => {
        if (a) {
          conv.ask('foo');
        } else {
          conv.ask('bar');
          conv.ask('baz');
        }
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        const lambdaFunc = ast.body[0].expression.arguments[1];
        assert(lambdaFunc.type === 'ArrowFunctionExpression');
        // put the arrowFunctionExpression on the stack
        manager.account(lambdaFunc,
            'ArrowFunctionExpression');
        const ifStmt = lambdaFunc.body.body[0];
        assert(ifStmt.type === 'IfStatement');
        // traverse body of if-statement's consequent
        manager.account(
            ifStmt.consequent,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});
        manager.account(
            ifStmt.alternate,
            'IfStatement > BlockStatement'
        );
        // conv.ask('baz'); conv.ask('bar');
        Object.assign(manager.currentScope(), {'metadata': true});
        assert(manager._scopeStack.length === 4);
        manager._eslintContext._ancestors = [lambdaFunc];
        manager.account(
            ifStmt,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression');
        expect(manager.currentScope().metadata).to.equal(true);
      });
      it('IfStatement (if)', function() {
        const code = `
      app.intent('test', conv => {
        if (a) {
          conv.ask('foo');
        }
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        const lambdaFunc = ast.body[0].expression.arguments[1];
        assert(lambdaFunc.type === 'ArrowFunctionExpression');
        // put the arrowFunctionExpression on the stack
        manager.account(lambdaFunc,
            'ArrowFunctionExpression');
        const ifStmt = lambdaFunc.body.body[0];
        assert(ifStmt.type === 'IfStatement');
        // traverse body of if-statement's consequent
        manager.account(
            ifStmt.consequent,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});
        assert(manager._scopeStack.length === 3);
        manager._eslintContext._ancestors = [lambdaFunc];
        manager.account(
            ifStmt,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression');
        expect(manager.currentScope().metadata).to.equal(true);
      });
      it('IfStatement (if-else-if)', function() {
        const code = `
      app.intent('test', conv => {
        if (a) {
          conv.ask('foo');
        } else if (b) {
          // nothing here
        } else {
          conv.ask('abc');
          conv.ask('acb');
          conv.ask('bac');
        }
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        const lambdaFunc = ast.body[0].expression.arguments[1];
        assert(lambdaFunc.type === 'ArrowFunctionExpression');
        // put the arrowFunctionExpression on the stack
        manager.account(lambdaFunc,
            'ArrowFunctionExpression');
        const ifStmt = lambdaFunc.body.body[0];
        assert(ifStmt.type === 'IfStatement');

        // if (a) { ... }
        manager.account(
            ifStmt.consequent,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});

        // if (b) { ... }
        manager.account(
            ifStmt.alternate,
            'IfStatement > IfStatement');
        manager.account(
            ifStmt.alternate.consequent,
            'IfStatement > BlockStatement'
        );

        manager.account(
            ifStmt.alternate.alternate,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});

        assert(manager._scopeStack.length === 6);

        manager._eslintContext._ancestors = [ifStmt];
        // exiting inner if
        manager.account(
            ifStmt.alternate,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('IfStatement > IfStatement');
        expect(manager.currentScope().metadata).to.equal(true);

        manager._eslintContext._ancestors = [lambdaFunc];
        // exiting outer if
        manager.account(
            ifStmt,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression');
        expect(manager._scopeStack.length).to.equal(2);
        expect(manager.currentScope().metadata).to.equal(true);
      });

      it('Intent handler (if-else-if etc.)', function() {
        const code = `
      app.intent('test', conv => {
        conv.close(new SimpleResponse({ text: 'yes' }));
        if (a) {
          conv.ask('foo');
        } else if (b) {
          conv.ask('bar');
          conv.ask('baz');
        } else {
          conv.ask('abc');
          conv.ask('acb');
          conv.ask('bac');
        }
        try {
          conv.ask('cba');
          conv.ask('cab');
        } catch (e) {
          // nothing
        }
        conv.close('almost done');
        conv.close('last one');
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        const lambdaFunc = ast.body[0].expression.arguments[1];
        assert(lambdaFunc.type === 'ArrowFunctionExpression');

        // conv.close(new SimlpeResponse(...));
        Object.assign(manager.currentScope(), {metadata: true});

        // put the arrowFunctionExpression on the stack
        manager.account(lambdaFunc,
            'ArrowFunctionExpression');
        const ifStmt = lambdaFunc.body.body[1];
        assert(ifStmt.type === 'IfStatement');

        // if (a) { ... }
        manager.account(
            ifStmt.consequent,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});

        // if (b) { ... }
        manager.account(
            ifStmt.alternate,
            'IfStatement > IfStatement');
        manager.account(
            ifStmt.alternate.consequent,
            'IfStatement > BlockStatement'
        );
        // conv.ask('bar'); conv.ask('baz');
        Object.assign(manager.currentScope(), {'metadata': true});

        manager.account(
            ifStmt.alternate.alternate,
            'IfStatement > BlockStatement');
        // conv.ask('foo');
        Object.assign(manager.currentScope(), {'metadata': true});

        assert(manager._scopeStack.length === 6);

        manager._eslintContext._ancestors = [ifStmt];
        // exiting the nested if-statement
        manager.account(
            ifStmt.alternate,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('IfStatement > IfStatement');
        expect(manager.currentScope().metadata).to.equal(true);

        manager._eslintContext._ancestors = [lambdaFunc];
        // exiting the outer if-statement
        manager.account(
            ifStmt,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression');
        expect(manager._scopeStack.length).to.equal(2);
        expect(manager.currentScope().metadata).to.equal(true);

        // try-catches
        manager.account(lambdaFunc.body.body[2], 'TryStatement');
        // conv.ask('cba'); conv.ask('cab');
        Object.assign(manager.currentScope(), {metadata: true});
        manager.account(lambdaFunc.body.body[2].handler, 'CatchClause');
        // conv.close(e)
        Object.assign(manager.currentScope(), {metadata: false});
        manager.account(lambdaFunc.body.body[2].handler, 'CatchClause:exit');
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression');
        expect(manager._scopeStack.length).to.equal(2);
        expect(manager.currentScope().metadata).to.equal(true);
      });
      it(`Intent handler (if-else-if etc.) without any
       client lib calls`, function() {
        const code = `
      app.intent('test', conv => {
        if (a) {
          console.log('foo');
        } else if (b) {
          console.log('bar');
        } else {
          // nop
        }
        try {
          foobarbaz();
        } catch (e) {
          // nothing
        }
      });
      `;
        const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
        const manager = getScopeManagerForIntentHandler(ast);
        const lambdaFunc = ast.body[0].expression.arguments[1];
        assert(lambdaFunc.type === 'ArrowFunctionExpression');
        // put the arrowFunctionExpression on the stack
        manager.account(lambdaFunc,
            'ArrowFunctionExpression, Intent');
        const ifStmt = lambdaFunc.body.body[0];
        assert(ifStmt.type === 'IfStatement');

        // if (a) { ... }
        manager.account(
            ifStmt.consequent,
            'IfStatement > BlockStatement');

        // if (b) { ... }
        manager.account(
            ifStmt.alternate,
            'IfStatement > IfStatement');
        manager.account(
            ifStmt.alternate.consequent,
            'IfStatement > BlockStatement'
        );
        manager.account(
            ifStmt.alternate.alternate,
            'IfStatement > BlockStatement');

        assert(manager._scopeStack.length === 6);

        manager._eslintContext._ancestors = [ifStmt];
        // exiting the nested if-statement
        manager.account(
            ifStmt.alternate,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('IfStatement > IfStatement');
        expect(manager.currentScope().metadata).to.equal(false);

        manager._eslintContext._ancestors = [lambdaFunc];
        // exiting the outer if-statement
        manager.account(
            ifStmt,
            'IfStatement:exit'
        );
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression, Intent');
        expect(manager._scopeStack.length).to.equal(2);
        expect(manager.currentScope().metadata).to.equal(false);

        // try-catches
        manager.account(lambdaFunc.body.body[1], 'TryStatement');
        manager.account(lambdaFunc.body.body[1].handler, 'CatchClause');
        manager.account(lambdaFunc.body.body[1].handler, 'CatchClause:exit');
        expect(manager.currentScope().event)
            .to.equal('ArrowFunctionExpression, Intent');
        expect(manager._scopeStack.length).to.equal(2);
        expect(manager.currentScope().metadata).to.equal(false);
      });
    });
  });
});
