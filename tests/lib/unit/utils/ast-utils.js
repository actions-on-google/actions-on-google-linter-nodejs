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

'use strict';

/**
 * @fileoverview Unit tests for the .../lib/utils/ast-utils.js
 */
const {findNodeDef,
  findVariableNodeValue} = require('../../../../lib/utils/ast-utils');
const {describe, it, xit} = require('mocha');
const {expect} = require('chai');
const espree = require('espree');
const eslintScope = require('eslint-scope');

const DEFAULT_CONFIG = {
  ecmaVersion: 8,
  // need to specify module; otherwise, parse doesn't resolve variables
  sourceType: 'module',
  // create a top-level tokens array containing all tokens
  tokens: true,
  comment: true,
  loc: true,
  range: true,
};

describe('findNodeDef', function() {
  it('Function defined in the global scope', function() {
    const code = `
      function fuzzy() {
        console.log('this is f');
      }
      app.intent('intent1', (conv) => {
        conv2.ask(fuzzy()); // for some reason code breaks if set conv2 to conv.
      });
    `;
    const ast = espree.parse(code, DEFAULT_CONFIG);
    const arrowFunctionNode = ast.body[1].expression.arguments[1];
    const scopeManager = eslintScope.analyze(ast, DEFAULT_CONFIG);
    const intentHandlerScope = scopeManager.acquire(arrowFunctionNode,
        DEFAULT_CONFIG);
    const calleeNode = arrowFunctionNode
        .body.body[0].expression.arguments[0].callee;
    expect(findNodeDef(intentHandlerScope, calleeNode)).to
        .deep.equal(ast.body[0]);
  });
  xit('Function defined in the intent scope', function() {
    const code = `
      app.intent('intent1', (conv) => {
        function fuzzy() {
          console.log('this is f');
        }
        conv2.ask(fuzzy()); // for some reason code breaks if set conv2 to conv.
      });
    `;
    const ast = espree.parse(code, DEFAULT_CONFIG);
    const arrowFunctionNode = ast.body[0].expression.arguments[1];
    const scopeManager = eslintScope.analyze(ast, DEFAULT_CONFIG);
    const intentHandlerScope = scopeManager.acquire(arrowFunctionNode,
        DEFAULT_CONFIG);
    const calleeNode = arrowFunctionNode
        .body.body[1].expression.arguments[0].callee;
    expect(findNodeDef(intentHandlerScope, calleeNode)).to
        .deep.equal(ast.body[0]);
  });
});

describe('findVariableNodeValue', function() {
  it('Variable defined in the intent handler scope', function() {
    const code = `
      app.intent('intent1', (conv) => {
        let a = 3;
        conv.ask(a);
      });
    `;
    const ast = espree.parse(code, DEFAULT_CONFIG);
    const a = ast.body[0].expression.arguments[1] // lambda func
        .body // block statement
        .body[1].expression // conv.ask(a);
        .arguments[0]; // a
    const scopeManager = eslintScope.analyze(ast, DEFAULT_CONFIG);
    const intentHandlerScope = scopeManager.acquire(
        ast.body[0].expression.arguments[1], // lambda scope
        DEFAULT_CONFIG);
    expect(findVariableNodeValue(intentHandlerScope, a)).to
        .have.property('value', 3);
  });
  it('Variable defined in the global scope', function() {
    const code = `
      let a = 3;
      app.intent('intent1', (conv) => {
        conv.ask(a);
      });
    `;
    const ast = espree.parse(code, DEFAULT_CONFIG);
    const a = ast.body[1].expression.arguments[1] // lambda func
        .body // block statement
        .body[0].expression // conv.ask(a);
        .arguments[0]; // a
    const scopeManager = eslintScope.analyze(ast, DEFAULT_CONFIG);
    const globalScope = scopeManager.acquire(
        ast, // global scope
        DEFAULT_CONFIG);
    expect(findVariableNodeValue(globalScope, a)).to
        .have.property('value', 3);
  });
  it('Variable not defined', function() {
    const code = `
      app.intent('intent1', (conv) => {
        conv.ask(a);
      });
    `;
    const ast = espree.parse(code, DEFAULT_CONFIG);
    const a = ast.body[0].expression.arguments[1] // lambda func
        .body // block statement
        .body[0].expression // conv.ask(a);
        .arguments[0]; // a
    const scopeManager = eslintScope.analyze(ast, DEFAULT_CONFIG);
    const globalScope = scopeManager.acquire(
        ast, // global scope
        DEFAULT_CONFIG);
    expect(findVariableNodeValue(globalScope, a)).to.be.undefined;
  });
});


