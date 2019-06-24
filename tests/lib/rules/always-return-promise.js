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
 * @fileoverview Tests for lib/rules/always-return-promise
 */

'use strict';

// -----------------------------------------------------------------------------
// Requirements
// -----------------------------------------------------------------------------
const rule = require('../../../lib/rules/always-return-promise');

const RuleTester = require('eslint').RuleTester;

const parserOptions = {ecmaVersion: 8};

const err = {
  message: 'Intent handler must return promise, if there is any.',
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('always-return-promise', rule, {
  valid: [
    {
      code: `
const app = dialogflow();
app.intent('foo', (conv) => {
  return doAsync().then(res => {
    conv.ask('hello');
  });
})`, parserOptions: parserOptions,
    },
    {
      code: `
const app = dialogflow();
app.intent('foo', (conv) => {
  const then = 'this should not be an error';
  return doAsync().then(res => {
    conv.ask('hello');
  });
})`, parserOptions: parserOptions,
    },
    {
      code: `
const app = actionssdk();
app.intent('foo', (conv) => {
  return asyncFoo().then(res => {
    anotherAsyncFoo().then(res => {
      conv.ask(res);
    });
  });
});
`, parserOptions: parserOptions},
  ],

  invalid: [
    {
      code: `
const app = dialogflow();
app.intent('foo', (conv) => {
  doAsync().then(res => {
    conv.ask('hello');
  })\
})`,
    parserOptions: parserOptions,
    errors: [err],
    },
    {
      code: `
const app = actionssdk();
app.intent('foo', (conv) => {
  asyncFoo().then(res => {
    anotherAsyncFoo().then(res => {
      conv.ask(res);
    });
  });
});
  `,
      parserOptions: parserOptions,
      errors: [err, err],
    },
  ],
});
