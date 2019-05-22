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
 * @fileoverview This file contains the base class for an Actions response
 * classifier. It's expected that specific response types will subclass and
 * define concrete behaviors.
 */

/* eslint valid-jsdoc: 0 */
'use strict';

const last = require('lodash.last');
const assert = console.assert; // eslint-disable-line no-console
const {findVariableNodeValue} = require('./../utils/ast-utils');

/**
 * Base class serves as an abstract class for Actions response classifiers.
 */
class Classifier {
  /**
   * Constructor.
   * @param {EslintContext} context (contains AST metadata)
   */
  constructor(context) {
    this._context = context;
  }

  /**
   * Abstract method that classifies the node. For example,
   * @example
   * class SimpleResponseClassifier extends Classifier {
   *   classify(node) {
   *     return isSimpleResponse(node);
   *   }
   * }
   * Will return {{result: bool, certain: bool}}.
   *
   * @param {ASTNode} node
   * @return {object} { certain: {bool}, result: {bool} }
   */
  classify(node) {
    throw new Error('implement in child subclasses.');
  }

  /**
   * Checks if the node is an intent handler. Only handles cases when
   * intent handler contains handler declaration. This was chosen due
   * to implementation simplicity - i.e. that way we know that handler code
   * will get visited **after** the intent handler, so we can easily flag
   * relevant sections of the code.
   *
   * @example
   * app.intent('a', (conv) => {
   *   // node corresponding to "app.intent(...)" is a handler
   *   // note: lambda doesn't matter.
   * });
   *
   * @example
   * app.intent('a', func); // not a handler
   * app.intent('a', 'func'); // not a handler
   *
   * @param {ASTNode} node
   * @return {boolean} true if node is an intent handler.
   */
  isNodeIntentHandler(node) {
    if (!node) {
      return false;
    }
    if (node.type !== 'CallExpression') {
      return false;
    }
    if (node.callee.type !== 'MemberExpression') {
      return false;
    }
    // app.intent('intent1', 'handler2');
    if (last(node.arguments) && last(node.arguments).type === 'Literal') {
      return false;
    }
    const memberExpression = node.callee;
    const valueOfMemberExpressionObject = findVariableNodeValue(
        this._context.getScope(), memberExpression.object);
    const isActionsApp =
      (valueOfMemberExpressionObject &&
        valueOfMemberExpressionObject.type === 'CallExpression') &&
      (valueOfMemberExpressionObject.callee.name === 'dialogflow' ||
        valueOfMemberExpressionObject.callee.name === 'actionssdk');
    if (isActionsApp &&
      (memberExpression.property.name === 'intent' ||
      memberExpression.property.name === 'fallback')) {
      // temp hack to dismiss intents that point to a function def as a handler.
      // for example, app.intent('', funcA);
      return !(node.arguments && node.arguments.length === 2 &&
          node.arguments[1].type === 'Identifier');
    }
    return false;
  }

  /**
   * Checks if node corresponds to an Actions client library call.
   * @example
   * conv.ask('hello'); // yes
   * myFunc(); // no
   *
   * @param {ASTNode} node
   * @return {boolean} true if node returns an Actions response.
   */
  doesReturnActionResponse(node) {
    if (!node) {
      return false;
    }
    if (node.type !== 'CallExpression') {
      return false;
    }
    if (node.callee.type !== 'MemberExpression') {
      return false;
    }
    // finds client library call by matching the property. ideally
    // needs another check to ensure the object was passed as one of
    // the parameters to intent handler.
    const memberExpression = node.callee;
    return memberExpression.object.name === 'conv' &&
        (memberExpression.property.name === 'close'
          || memberExpression.property.name === 'ask'
          || memberExpression.property.name === 'json');
  }

  /**
   * Factory method to create a response from the classifier.
   * @param {boolean} certain
   * @param {boolean} result
   * @return {{result: bool, certain: bool}}
   * @private
   */
  _createResponse(certain, result) {
    assert(certain !== undefined && result !== undefined);
    return {
      certain,
      result,
    };
  }
}

module.exports = {
  Classifier: Classifier,
};
