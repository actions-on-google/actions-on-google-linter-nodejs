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
 * @fileoverview If intent handler uses Promise, it must return it.
 *
 */

'use strict';

const {Classifier} = require('./../classifier/response-classifier');

// -----------------------------------------------------------------------------
// Rule Definition
// -----------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: `the intent handler in Actions on Google fulfillment needs
      to return a promise, if there is any.`,
      category: 'Possible Errors',
      recommended: false,
    },
  },
  create: function(context) {
    const classifier = new Classifier(context);

    // ----------------------------------------------------------------------
    // Public
    // ----------------------------------------------------------------------
    return {
      'MemberExpression': function(memberExpression) {
        if (memberExpression.property.name === 'then') {
          const insideIntent = context.getAncestors().find((node) => {
            return classifier.isNodeIntentHandler(node);
          });
          const isReturned = context.getAncestors().find((element) => {
            return element.type === 'ReturnStatement';
          });
          if (insideIntent && !isReturned) {
            context.report({
              node: memberExpression,
              message: 'Intent handler must return promise, if there is any.',
            });
          }
        }
      },
    };
  },
};
