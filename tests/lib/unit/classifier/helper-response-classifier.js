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
 * @fileoverview Unit tests for
 * .../js/lib/classifier/simple-response-classifier.js
 */

/* eslint require-jsdoc: 0 */
'use strict';

const {HelperResponseClassifier} =
    require('./../../../../lib/classifier/helper-response-classifier');
const {describe, it} = require('mocha');
const {expect} = require('chai');
const espree = require('espree');
const eslintScope = require('eslint-scope');
const assert = console.assert; // eslint-disable-line no-console
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

describe('SimpleResponseClassifier', function() {
  describe('#constructor', function() {
    it('Check context is being set', function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      expect(classifier._context).to.not.be.undefined;
      expect(classifier._context).to.not.be.null;
    });
  });
  describe('#classify', function() {
    function createScope(ast) {
      const scopeManager = eslintScope.analyze(ast, DEFAULT_ESPREE_CONFIG);
      const scope = scopeManager.acquire(ast,
          DEFAULT_ESPREE_CONFIG);
      assert(scope);
      return scope;
    }

    it('Check SimpleResponse classified as No', function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(new SimpleResponse({text: 'foo', displayText: 'bar'}));
      `, DEFAULT_ESPREE_CONFIG);
      const simpleResponseNode = ast.body[0].expression.arguments[0];
      expect(classifier.classify(simpleResponseNode)).to.deep.equal({
        certain: true,
        result: false,
      });
    });
    it('Check vanilla string classified as No', function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask('Hello World');
      `, DEFAULT_ESPREE_CONFIG);
      const simpleResponseNode = ast.body[0].expression.arguments[0];
      expect(classifier.classify(simpleResponseNode)).to.deep.equal({
        certain: true,
        result: false,
      });
    });
    it('Check BasicCard classified as Yes', function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(new BasicCard({title: 'foo', displayText: 'bar'}));
      `, DEFAULT_ESPREE_CONFIG);
      const card = ast.body[0].expression.arguments[0];
      expect(classifier.classify(card)).to.deep.equal({
        certain: true,
        result: false,
      });
    });

    it('Check a user-degfined type classified as No', function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(new MyType({text: 'foo', displayText: 'bar'}));
      `, DEFAULT_ESPREE_CONFIG);
      const node = ast.body[0].expression.arguments[0];
      expect(classifier.classify(node)).to.deep.equal({
        certain: true,
        result: false,
      });
    });

    it(`Check function call to be classified as No
      and not certain`, function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(foo());
      `, DEFAULT_ESPREE_CONFIG);
      const funcCall = ast.body[0].expression.arguments[0];
      expect(classifier.classify(funcCall)).to.deep.equal({
        certain: false,
        result: false,
      });
    });

    it(`Check SignIn is classified as Yes`, function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(new SignIn({}));
      `, DEFAULT_ESPREE_CONFIG);
      const signIn = ast.body[0].expression.arguments[0];
      expect(classifier.classify(signIn)).to.deep.equal({
        certain: true,
        result: true,
      });
    });

    it(`Check List is classified as Yes`, function() {
      const classifier = new HelperResponseClassifier(new MockContext(null));
      const ast = espree.parse(`
        conv.ask(new List({}));
      `, DEFAULT_ESPREE_CONFIG);
      const list = ast.body[0].expression.arguments[0];
      expect(classifier.classify(list)).to.deep.equal({
        certain: true,
        result: true,
      });
    });

    it(`Check if a CompletePurchase is defined in a variable,
      and is classified as Yes`, function() {
      const ast = espree.parse(`
        app.intent('foo', conv => {
          const x = new CompletePurchase({id: 'foo'});
          conv.ask(x);
        });
      `, DEFAULT_ESPREE_CONFIG);
      const completePurchaseNode = ast.body[0].expression.
          arguments[1]. // arrow func
          body.
          body[1]. // conv.ask
          expression.arguments[0]; // x
      assert(completePurchaseNode.type === 'Identifier');
      const lambdaFuncNode = ast.body[0].expression.arguments[1];
      const classifier = new HelperResponseClassifier(
          new MockContext(createScope(lambdaFuncNode)));
      expect(classifier.classify(completePurchaseNode)).to.deep.equal({
        certain: true,
        result: true,
      });
    });

    it(`Check if a SignIn is defined in a global variable,
    and is classified as Yes`, function() {
      const ast = espree.parse(`
        let y = new SignIn();
        app.intent('foo', conv => {
          conv.ask(y);
        });
      `, DEFAULT_ESPREE_CONFIG);
      const signIn = ast.body[1].expression.
          arguments[1]. // arrow func
          body.
          body[0]. // conv.ask
          expression.arguments[0]; // y;
      assert(signIn.type === 'Identifier');
      // Passing global scope because it looks like the eslintScope
      // doesn't populate #upper property
      const classifier = new HelperResponseClassifier(
          new MockContext(createScope(ast)));
      expect(classifier.classify(signIn)).to.deep.equal({
        certain: true,
        result: true,
      });
    });
  });
});
