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
 * @fileoverview The response returned by Actions on Google fulfillment
 * must return a client library response.
 *
 */

'use strict';

const {PresenceScopeManager} = require('../scope/presence-scope-manager');
const {Classifier} = require('./../classifier/response-classifier');

// -----------------------------------------------------------------------------
// Rule Definition
// -----------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'the intent handler in Actions on Google fulfillment must ' +
      'return a client library response.',
      category: 'Possible Errors',
      recommended: false,
    },
  },

  create: function(context) {
    // variables should be defined here
    const manager = new PresenceScopeManager(context, report);
    const classifier = new Classifier(context);
    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    /**
     * Helper function that will report the issues to developer if any
     * violations were detected.
     *
     * @param{Object}violationNode
     */
    function report(violationNode) {
      // metadata corresponds to whether linter was able to detect a client
      // library call inside of intent handler.
      if (!(manager.currentScope().metadata)) {
        context.report({
          node: violationNode,
          message: 'Must return a response from the intent handler.',
        });
      }
    }

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      // other stuff
      'CallExpression': function(callExpression) {
        if (classifier.doesReturnActionResponse(callExpression) ||
            // this checks if call expression (i.e. function call) is made
            // inside of intent handler, in which case can't tell for sure if
            // it returns response or not, but better be less vocal.
            manager.isScopeInsideIntent(manager.currentScope())) {
          Object.assign(manager.currentScope(), {metadata: true});
        }
      },

      'IfStatement > ExpressionStatement': function(expressionStatement) {
        manager.account(expressionStatement,
            'IfStatement > ExpressionStatement');
      },
      'IfStatement > BlockStatement': function(blockStatement) {
        manager.account(blockStatement, 'IfStatement > BlockStatement');
      },
      // if is part of else block (i.e. if-else-if-...)
      'IfStatement > IfStatement': function(ifStatement) {
        manager.account(ifStatement, 'IfStatement > IfStatement');
      },
      'IfStatement:exit': function(ifStatement) {
        manager.account(ifStatement, 'IfStatement:exit');
      },
      'FunctionExpression': function(func) {
        const event = classifier.isNodeIntentHandler(func.parent) ?
            'FunctionExpression' + ', Intent' :
            'FunctionExpression';
        manager.account(func, event);
      },
      'FunctionExpression:exit': function(func) {
        const event = classifier.isNodeIntentHandler(func.parent) ?
            'FunctionExpression:exit' + ', Intent' :
            'FunctionExpression:exit';
        manager.account(func, event);
      },
      'ArrowFunctionExpression': function(lambda) {
        const event = classifier.isNodeIntentHandler(lambda.parent) ?
            'ArrowFunctionExpression' + ', Intent' :
            'ArrowFunctionExpression';
        manager.account(lambda, event);
      },
      'ArrowFunctionExpression:exit': function(lambda) {
        const event = classifier.isNodeIntentHandler(lambda.parent) ?
            'ArrowFunctionExpression:exit' + ', Intent' :
            'ArrowFunctionExpression:exit';
        manager.account(lambda, event);
      },
      'FunctionDeclaration': function(funcDecl) {
        manager.account(funcDecl, 'FunctionDeclaration');
      },
      'FunctionDeclaration:exit': function(funcDecl) {
        manager.account(funcDecl, 'FunctionDeclaration:exit');
      },
      'MethodDefinition': function(methodDef) {
        manager.account(methodDef, 'MethodDefinition');
      },
      'MethodDefinition:exit': function(methodDef) {
        manager.account(methodDef, 'MethodDefinition:exit');
      },
      'CatchClause': function(catchClause) {
        manager.account(catchClause, 'CatchClause');
      },
      'TryStatement > BlockStatement': function(tryStatement) {
        manager.account(tryStatement, 'TryStatement > BlockStatement');
      },
      'TryStatement > ExpressionStatement': function(tryStatement) {
        manager.account(tryStatement, 'TryStatement > ExpressionStatement');
      },
      'CatchClause:exit': function(catchClause) {
        manager.account(catchClause, 'CatchClause:exit');
      },
    };
  },
};
