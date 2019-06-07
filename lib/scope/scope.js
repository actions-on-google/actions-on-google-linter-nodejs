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
 * @fileoverview File containing the class for Scope entity used in the linter
 * to keep track of violations and metadata that linter uses to make decisions.
 */

/**
 * Data structure representing the scope.
 */
class Scope {
  /**
   * Initializes all properties of the scope.
   * @param {Object} options
   */
  constructor(options) {
    this.event = options.event;
    this.metadata = options.metadata;
    this.lastViolatingNode = options.lastViolatingNode;
    this.hasReturnStatement = options.hasReturnStatement;
  }
}

module.exports = {
  Scope: Scope,
};
