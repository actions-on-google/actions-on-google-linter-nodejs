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
 * @fileoverview Various AST utility functions.
 */
const logger = require('winston').loggers.get('DEFAULT_LOGGER');
const {inspect} = require('util');
const last = require('lodash.last');

/*
  Couple of notes based on obervations and some limited testing I've done:
    1. scope will contain references and variables of the global scope
*/

/**
 * Finds the node *definition* that corresponds to a "name". This often is used
 * to find a Node instance corresponding to a function name.
 *
 * For example,
 *   function f() {
 *
 *   }
 *
 *   f(); // will find the node corresponding to funciton f() node.
 *
 * Will iteratively check enclosing scopes starting from the "scope". It will
 * stop after the global scope has been checked.
 *
 * @param {RuleScope} scope current scope
 * @param {ASTNode} node
 * @return {ASTNode?} ASTNode corresponding to a definition of the param node,
 * or undefined if not found.
 */
function findNodeDef(scope, node) {
  let retVal;
  while (scope && !retVal) {
    const references = scope.references;
    for (const r of references) {
      if (r.resolved) {
        for (const d of r.resolved.defs) {
          // d.name = the Identifier node of this definition
          if (d.name.name === node.name) {
            retVal = d.node;
            break;
          }
        }
      }
      if (retVal) break;
    }
    scope = scope.upper;
  }
  return retVal;
}


/**
 * Finds a node definition that corresponds to a node some variable.
 * For example,
 *   let f = 3; // need to find this node
 *   function y() {
 *     // f is an identifierNode;
 *     // need to find a node corresponding to declaration of f.
 *     let x = f;
 *   }
 *
 * This node is not neccessarily required; similar thing can be accomplished by
 *   const val = findNodeDef(context.getScope(), a.name).init;
 * However, I don't know difference between references and variables in the
 * context of eslint, so I'd rather use variables explicitly for this.
 *
 * Will iteratively check enclosing scopes starting from the "scope". It will
 * stop after the global scope has been checked.
 *
 * @param {RuleScope} scope
 * @param {ASTNode} identifierNode
 * @return {ASTNode} node corresponding to the value of the identifierNode.
 */
function findVariableNodeValue(scope, identifierNode) {
  if (identifierNode.type !== 'Identifier') {
    throw new Error(`Expected Identifier,
      but got ${identifierNode.type}. ${inspect(identifierNode)}`);
  }
  let val;
  while (scope && !val) {
    const variables = scope.variables;
    // to get value of a variable, need to get to var.defs[].name field
    for (const v of variables) {
      const defs = v.defs.filter((d) => d.name.name === identifierNode.name);
      if (defs.length > 0) {
        val = last(defs).node.init;
      }
      if (val) break;
    }
    if (!val) {
      scope = scope.upper;
    }
  }
  logger.debug(`val of ${identifierNode.name} is ${inspect(val)}`);
  return val;
}

module.exports = {
  findNodeDef: findNodeDef,
  findVariableNodeValue: findVariableNodeValue,
};
