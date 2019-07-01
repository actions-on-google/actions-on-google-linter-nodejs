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
 * @fileoverview Implementation for a helper response classifier.
 */

'use strict';

const {
  findVariableNodeValue,
} = require('./../utils/ast-utils');
const {Classifier} = require('./response-classifier');
const assert = console.assert; // eslint-disable-line no-console

// fetched from https://github.com/actions-on-google/actions-on-google-nodejs/tree/master/src/service/actionssdk/conversation/helper
const HELPER_CLASSES = [
  'SignIn',
  'RegisterUpdate',
  'DeepLink',
  'DateTime',
  'Confirmation',
  'NewSurface',
  'Place',
  // transactions
  'CompletePurchase',
  'Decision',
  'DeliveryAddress',
  'TransactionRequirements',
  // permissions
  'Permission',
  'PermissionOptions',
  'UpdatePermission',
  // option
  'List',
  'Carousel',
];

/**
 * Classifies an ASTNode as an Actions on Google client library helper response.
 */
class HelperResponseClassifier extends Classifier {
  /**
   * Classifies node as a helper response.
   * @param {ASTNode} node
   * @return {object} { certain: {bool}, result: {bool} }
   * @override
   */
  classify(node) {
    return this._isHelperResponse(node);
  }

  /**
   * Utility method that classifies an ASTNode as a helper response.
   * @example
   * new SimpleResponse('foo'); // no
   * 'foo' // no
   * new BasicCard({}); // no
   * foo(); // no; since can't deduce return type of foo.
   * new List(); // yes
   * new SignIn(); // yes
   *
   * @param {ASTNode} node
   * @return {{certain: boolean, result: boolean}}
   * @private
   */
  _isHelperResponse(node) {
    let result;
    switch (node.type) {
      case 'NewExpression': {
        result = this._createResponse(true,
            HELPER_CLASSES.indexOf(node.callee.name) !== -1);
        break;
      }
      case 'Identifier': {
        // valueNode will be undefined if variable defined by node is a
        // parameter of a function.
        const valueNode = findVariableNodeValue(this._context.getScope(), node);
        result = valueNode ? this._isHelperResponse(valueNode):
          this._createResponse(false, false);
        break;
      }
      case 'CallExpression': // example: conv.ask(foo()); <- foo is the node
      case 'MemberExpression': // property of an object example: conv.ask(a.b.c)
      case 'SpreadElement': {
        result = this._createResponse(false, false);
        break;
      }
      default: {
        result = this._createResponse(true, false);
      }
    }
    assert(result);
    return result;
  }
}

module.exports = {
  HelperResponseClassifier,
};
