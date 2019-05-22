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
 * @fileoverview Unit tests for .../js/lib/classifier/response-classifier.js
 */

/* eslint require-jsdoc: 0 */
'use strict';

const {Classifier} =
  require('./../../../../lib/classifier/response-classifier');
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

describe('Classifier', function() {
  describe('#constructor', function() {
    it('Check context is being set', function() {
      const classifier = new Classifier(new MockContext(null));
      expect(classifier._context).to.not.be.undefined;
      expect(classifier._context).to.not.be.null;
    });
  });
  describe('#classify', function() {
    it('Check method is abstract', function() {
      const classifier = new Classifier(new MockContext(null));
      expect(classifier.classify).to.throw(Error);
    });
  });
  describe('#_createResponse', function() {
    it('Verify the properties of return value', function() {
      const classifier = new Classifier(new MockContext(null));
      expect(classifier._createResponse(true, false)).to.have
          .all.keys('certain', 'result');
      expect(classifier._createResponse(false, false)).to.have
          .all.keys('certain', 'result');
      expect(classifier._createResponse(true, true)).to.have
          .all.keys('certain', 'result');
    });
    it('Verify that empty arguments fail', function() {
      const classifier = new Classifier(new MockContext(null));
      expect(classifier._createResponse).to.throw(Error);
    });
  });
  describe('#doesReturnActionResponse', function() {
    const classifier = new Classifier(new MockContext(null));
    it('Pass valid CallExpression', function() {
      let ast = espree.parse('conv.ask("hello");', DEFAULT_ESPREE_CONFIG);
      let callExpression = ast.body[0].expression;
      expect(classifier.doesReturnActionResponse(callExpression)).to.be.true;
      ast = espree.parse('conv.close("hello");', DEFAULT_ESPREE_CONFIG);
      callExpression = ast.body[0].expression;
      expect(classifier.doesReturnActionResponse(callExpression)).to.be.true;
    });
    it('Pass invalid CallExpression', function() {
      const ast = espree.parse('foo(foobar());', DEFAULT_ESPREE_CONFIG);
      const callExpression = ast.body[0].expression;
      expect(classifier.doesReturnActionResponse(callExpression)).to.be.false;
    });
    it('Pass not a CallExpression', function() {
      const ast = espree.parse('new SimpleResponse();', DEFAULT_ESPREE_CONFIG);
      expect(classifier.doesReturnActionResponse(ast.body[0])).to.be.false;
    });
  });
  describe('#isNodeIntentHandler', function() {
    function createGlobalScope(ast) {
      const scopeManager = eslintScope.analyze(ast, DEFAULT_ESPREE_CONFIG);
      const programScope = scopeManager.acquire(ast,
          DEFAULT_ESPREE_CONFIG);
      assert(programScope);
      return programScope;
    }
    it('Pass valid CallExpression (dialogflow)', function() {
      const code = `const app = dialogflow(); app.intent('foo', function(conv) {
        // ...
      });`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.true;
    });
    it('Pass valid CallExpression (actionssdk)', function() {
      const code = `
      const app = actionssdk();
      app.intent('foo', (conversation) => {
        // ...
      });`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.true;
    });
    it(`Pass valid CallExpression
      (dialogflow instance is called myapp)`, function() {
      const code = `
      const myapp = dialogflow();
      myapp.intent('foo', function(conv) {
        // check requires instance of dialogflow/actionssdk to be named app
      });`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.true;
    });
    it(`Pass invalid CallExpression
      (app is not an instance of dialogflow/actionssdk`, function() {
      const code = `
      const app = myfunction();
      app.intent('foo', conv => {
      });`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.false;
    });
    it(`Pass invalid CallExpression
      (not an instance of dialogflow/actionssdk`, function() {
      const code = `conv.ask('hello');`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[0];
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.false;
    });
    it('Pass not a CallExpression', function() {
      const code = `new SimpleResponse();`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      expect(classifier.isNodeIntentHandler(ast.body[0])).to.be.false;
    });
    it('Intent handler refers to an existing handler', function() {
      const code = `
      const app = actionssdk();
      app.intent('intent1', 'handler2')`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(callExpression.type).to.equal('CallExpression');
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.false;
    });
    it('Intent handler refers to a function defined elsewhere', function() {
      const code = `const app = actionssdk(); app.intent('intent1', handler2)`;
      const ast = espree.parse(code, DEFAULT_ESPREE_CONFIG);
      const classifier = new Classifier(
          new MockContext(createGlobalScope(ast)));
      const callExpression = ast.body[1].expression;
      expect(callExpression.type).to.equal('CallExpression');
      expect(classifier.isNodeIntentHandler(callExpression)).to.be.false;
    });
  });
});
