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
 * @fileoverview Implementation for a simple response classifier.
 */

'use strict';

const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {inspect} = require('util');
const {
  findVariableNodeValue,
} = require('./../utils/ast-utils');
const {Classifier} = require('./response-classifier');
const assert = console.assert; // eslint-disable-line no-console

/**
 * Classifies an ASTNode as a simple response.
 */
class SimpleResponseClassifier extends Classifier {
  /**
   * Classifies node as a simple response.
   * @param {ASTNode} node
   * @return {object} { certain: {bool}, result: {bool} }
   * @override
   */
  classify(node) {
    return this._isSimpleResponse(node);
  }

  /**
   * Utility method that classifies an ASTNode as a simple response.
   * @example
   * new SimpleResponse('foo'); // yes
   * 'foo' // yes
   * new BasicCard({}); // no
   * foo(); // no; since can't deduce return type of foo.
   *
   * @param {ASTNode} node
   * @return {{certain: boolean, result: boolean}}
   * @private
   */
  _isSimpleResponse(node) {
    let result;
    switch (node.type) {
      // node is a function call
      // example: conv.ask(foo()); <- foo is the node
      case 'CallExpression': {
        result = this._createResponse(false, false);
        break;
      }
      // node is a variable
      // example: let a = 'foo'; conv.ask(a);
      case 'Identifier': {
        let val;
        if ((val = findVariableNodeValue(this._context.getScope(), node))) {
          result = this._isSimpleResponse(val);
        } else {
          logger.debug(`Variable ${node.name} was declared, but the software
couldn't find it. ${inspect(node.loc)}`);
          result = this._createResponse(false, false);
        }
        break;
      }
      // node is property of an object
      // example: conv.ask(a.b.c);
      case 'MemberExpression':
      case 'SpreadElement': {
        result = this._createResponse(false, false);
        break;
      }
      case 'NewExpression': {
        result = (node.callee.name === 'SimpleResponse') ?
            this._createResponse(true, true):
            this._createResponse(true, false);
        break;
      }
      default:
        // node evaluates to string
        // example: conv.ask('hello world');
        result = this._isString(node) ?
          this._createResponse(true, true):
          this._createResponse(true, false);
    }
    assert(result);
    return result;
  }

  /**
   * Utility method to check if a node resolves to a string.
   * @example
   * 'hello' // yes
   * `1` + `2` // yes
   * 3 // yes (JS converts to string)
   * null // yes (JS converts to string)
   *
   * @param {ASTNode} node
   * @return {boolean}
   * @private
   */
  _isString(node) {
    return node.type === 'Literal' ||
        (node.type === 'BinaryExpression' &&
            (node.left.type === 'Literal' ||
                node.right.type === 'Literal' ||
                node.left.type === 'TemplateLiteral' ||
                node.right.type === 'TemplateLiteral'))
        || node.type === 'TemplateLiteral';
  }
}

module.exports = {
  SimpleResponseClassifier,
};
