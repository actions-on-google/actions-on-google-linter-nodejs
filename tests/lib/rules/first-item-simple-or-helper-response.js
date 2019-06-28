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
 * @fileoverview Tests for lib/rules/first-item-simple-or-helper-response
 */
'use strict';

require('../../../lib/utils/logger');

// -----------------------------------------------------------------------------
// Requirements
// -----------------------------------------------------------------------------

const rule = require('../../../lib/rules/first-item-simple-or-helper-response');

const RuleTester = require('eslint').RuleTester;

const parserOptions = {ecmaVersion: 8};

const error = {
  message: 'First item must be a simple response or a helper',
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('first-item-simple-or-helper-response', rule, {
  valid: [
    {
      code: `conv.ask('Hello World')`,
    },
    {
      code: `
conv.ask(new SimpleResponse('Hello World'));
conv.ask(new Suggestions([1,2,3]));
      `,
    },
    {
      code: `
conv.close('Hm, I can not find details for selectedSKUId. Good bye.');
      `,
      parserOptions: parserOptions,
    },
    {
      code: `conv.ask('Hello ' + 'world');`,
    },
    {
      code: `
const x = 'Hello World';
conv.ask(x);
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('Unrecognized Deep Link Fallback', (conv) => {
  const response = util.format(responses.general.unhandled, conv.query);
  const suggestions = responses.categories.map((c) => c.suggestion);
  conv.ask(response, new Suggestions(suggestions));
});
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('Unrecognized Deep Link Fallback', (conv) => {
  const response = util.format(responses.general.unhandled, conv.query);
  const suggestions = responses.categories.map((c) => c.suggestion);
  this.conv.close(...response);
});
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('foo', function(conv) {
  conv.ask(someFunc());
});
`,
    },
    {
      code: `
app.intent('foo', function(conv) {
  conv.ask(new SignIn());
  conv.ask(new BasicCard());
});
`,
    },
  ],

  invalid: [
    {
      code: `
conv.ask(new BasicCard({}));
conv.ask('Hello');
`,
      errors: [error],
    },
    {
      code: `
function foo() {
  conv.ask(new BasicCard({}));
}`,
      errors: [error],
    },
  ],
});
