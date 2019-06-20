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
 * must have <=2 simple responses per turn.
 *
 * Please consult the official docs https://developers.google.com/actions/assistant/responses
 * for more details about the rule.
 */
'use strict';
const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {CountScopeManager} = require('./../scope/count-scope-manager');
const {SimpleResponseClassifier} =
    require('./../classifier/simple-response-classifier');
const {inspect} = require('util');

// -----------------------------------------------------------------------------
// Rule Definition
// -----------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'the response returned by Actions on Google fulfillment'
          + ' must have <=2 simple responses.',
      category: 'Possible Errors',
      recommended: false,
    },
  },

  create: function(context) {
    const manager = new CountScopeManager(context, report);
    const classifier = new SimpleResponseClassifier(context);

    /**
     * Helper function that will report the issues to developer if any
     * violations were detected.
     */
    function report() {
      if (manager.currentScope().metadata > 2) {
        context.report({
          node: manager.currentScope().lastViolatingNode,
          message: `At most two simple responses are allowed.`,
        });
      }
    }

    /**
     * Checks whether a node is a simple response.
     * @param {EslintNode} node
     * @return {bool} if node is a simple response.
     */
    function isSimpleResponse(node) {
      const judgeResponse = classifier.classify(node);
      if (!judgeResponse.certain) {
        logger.debug(`Node ${inspect(node)} may have been an
        extra simple response. Linter was not able to tell for sure.`);
      }
      return judgeResponse.certain && judgeResponse.result;
    }

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    return {
      // this is what client library call would fall under
      'CallExpression': function(callExpression) {
        // checks if it's something like "conv.ask" etc.
        if (classifier.doesReturnActionResponse(callExpression)) {
          const args = callExpression.arguments;
          for (const a of args) {
            if (isSimpleResponse(a)) {
              const memberExpression = callExpression.callee;
              Object.assign(manager.currentScope(),
                  {metadata: manager.currentScope().metadata + 1,
                    lastViolatingNode: memberExpression});
            }
            report();
          }
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
        // checks if function/lambda is inside of an "app.intent"-like structure
        const event = classifier.isNodeIntentHandler(func.parent) ?
            'FunctionExpression' + ', Intent' :
            'FunctionExpression';
        manager.account(func, event);
      },
      'FunctionExpression:exit': function(func) {
        // checks if function/lambda is inside of an "app.intent"-like structure
        const event = classifier.isNodeIntentHandler(func.parent) ?
            'FunctionExpression:exit' + ', Intent' :
            'FunctionExpression:exit';
        manager.account(func, event);
      },
      'ArrowFunctionExpression': function(lambda) {
        // checks if function/lambda is inside of an "app.intent"-like structure
        const event = classifier.isNodeIntentHandler(lambda.parent) ?
            'ArrowFunctionExpression' + ', Intent' :
            'ArrowFunctionExpression';
        manager.account(lambda, event);
      },
      'ArrowFunctionExpression:exit': function(lambda) {
        // checks if function/lambda is inside of an "app.intent"-like structure
        const event = classifier.isNodeIntentHandler(lambda.parent) ?
            'ArrowFunctionExpression:exit' + ', Intent' :
            'ArrowFunctionExpression:exit';
        manager.account(lambda, event);
      },
      'MethodDefinition': function(methodDef) {
        manager.account(methodDef, 'MethodDefinition');
      },
      'MethodDefinition:exit': function(methodDef) {
        manager.account(methodDef, 'MethodDefinition:exit');
      },
      'FunctionDeclaration': function(funcDecl) {
        manager.account(funcDecl, 'FunctionDeclaration');
      },
      'FunctionDeclaration:exit': function(funcDecl) {
        manager.account(funcDecl, 'FunctionDeclaration:exit');
      },
      // "finally" doesnt matter because it always gets
      // executed so contributes to global scope.
      'CatchClause': function(catchClause) {
        manager.account(catchClause, 'CatchClause');
      },
      'CatchClause:exit': function(catchClause) {
        manager.account(catchClause, 'CatchClause:exit');
      },
      'TryStatement': function(tryStatement) {
        manager.account(tryStatement, 'TryStatement');
      },
      'ReturnStatement': function(returnStatement) {
        manager.account(returnStatement, 'ReturnStatement');
      },
    };
  },
};
