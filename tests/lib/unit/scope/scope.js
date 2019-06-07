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

const {Scope} =
    require('./../../../../lib/scope/scope');
const {describe, it} = require('mocha');
const {expect} = require('chai');

describe('Scope', function() {
  describe('#constructor', function() {
    it('Check all variables are set', function() {
      const scope = new Scope({
        event: 'CallExpression:exit, Intent',
        metadata: 1,
        hasReturnStatement: false,
      });
      expect(scope.event).to.equal('CallExpression:exit, Intent');
      expect(scope.metadata).to.equal(1);
      expect(scope.lastViolatingNode).to.be.an('undefined');
      expect(scope.hasReturnStatement).to.be.false;
    });
  });
});
