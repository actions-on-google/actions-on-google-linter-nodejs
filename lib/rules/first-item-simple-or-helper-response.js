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
 * @fileoverview The first item in webhook response must be a simple response,
 * or a helper
 *
 * Please consult the official docs https://developers.google.com/actions/assistant/responses
 * for more details about the rule.
 */

'use strict';

const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {HelperResponseClassifier} =
    require('./../classifier/helper-response-classifier');
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
      description: 'the first item in webhook response must be a '
        + 'simple response, or a helper.',
      category: 'Possible Errors',
      recommended: false,
    },
  },

  create: function(context) {
    const helperClassifier = new HelperResponseClassifier(context);
    const simpleResponseClassifier = new SimpleResponseClassifier(context);
    // flag indicating when linter should treat a client library call as the
    // first response building call. It's set true at the beginning of each
    // intent handler declaration, which is during entrance of
    // FunctionDeclaration and ArrowFunctionExpression. It's set to false
    // after processing of the first such client library call.
    let firstResponseBuildingCall = true;

    /**
     * Checks whether a node is a simple response.
     * @param {EslintNode} node
     * @return {bool} if node is a simple response.
     */
    function isSimpleResponse(node) {
      const {certain, result} = simpleResponseClassifier.classify(node);
      if (!certain) {
        logger.debug(`Node ${inspect(node)} may have been an
        extra simple response. Linter was not able to tell for sure.`);
      }
      return !certain || result;
    }

    /**
     * Checks whether a node is a helper response
     * @param {EslintNode} node
     * @return {bool} if node is a helper response.
     */
    function isHelperResponse(node) {
      const {certain, result} = helperClassifier.classify(node);
      if (!certain) {
        logger.debug(`Node ${inspect(node)} may have been a
         helper response. Linter was not able to tell for sure.`);
      }
      return !certain || result;
    }

    /**
     * Helper function to check if args contain a simple or helper response.
     * @param {Array<ESLintNode>}args
     * @return {boolean} whether args contain a simple or helper response
     */
    function doesContainHelperOrSimple(args) {
      let result = false;
      for (const a of args) {
        if (isHelperResponse(a) || isSimpleResponse(a)) {
          result = true;
          break;
        }
      }
      return result;
    }

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------

    return {
      'CallExpression': function(callExpression) {
        if (simpleResponseClassifier.doesReturnActionResponse(callExpression)) {
          const args = callExpression.arguments;
          if (firstResponseBuildingCall && !doesContainHelperOrSimple(args)) {
            context.report({
              node: callExpression.callee,
              message: `First item must be a simple response or a helper`,
            });
          }
          if (firstResponseBuildingCall) {
            firstResponseBuildingCall = false;
          }
        }
      },
      'FunctionDeclaration': function(funcDeclaration) {
        firstResponseBuildingCall = simpleResponseClassifier
            .isNodeIntentHandler(funcDeclaration.parent);
      },
      'ArrowFunctionExpression': function(arrowFuncExpression) {
        firstResponseBuildingCall = simpleResponseClassifier
            .isNodeIntentHandler(arrowFuncExpression.parent);
      },
    };
  },
};
