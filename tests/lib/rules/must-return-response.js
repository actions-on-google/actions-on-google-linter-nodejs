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
 * @fileoverview Tests for lib/rules/must-return-response
 */
'use strict';

// -----------------------------------------------------------------------------
// Requirements
// -----------------------------------------------------------------------------

const rule = require('../../../lib/rules/must-return-response');

const RuleTester = require('eslint').RuleTester;

const parserOptions = {ecmaVersion: 8};
const error = {
  message: 'Must return a response from the intent handler.',
};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('must-return-response', rule, {
  valid: [
    // no errors because console.log is still a function call,
    // so per linters policy it's better to be less vocal.
    {
      code: `
const app = dialogflow();
app.intent('foo', (conv) => {
  try {
    doStuff();
    conv.ask('hello');
    return;
  } catch (e) {
    console.log('foo');
    return
  }
})`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('foo', (conv)=>{
if (a) doSomething();
else doSomethingElse();
});
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('foo', (conv)=>{
  doSomething();
});
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('foo', (conv) => {
if (a) {
  conv.ask('world');
} else {
  conv.ask('hello');
}
})`, parserOptions: parserOptions,
    },
    {
      code: `
function x(y) {
  if (y % 2 === 0) {
    return true;
  } else {
    return false;
  }
}`,
    },
    {
      code: `
app.intent('Initiate the Purchase', async (conv, {SKU}) => {
  const selectedSKUId = conv.arguments.get('OPTION') || SKU;
  const selectedSKU = conv.data.skus[selectedSKUId];
  if (!selectedSKU) {
    conv.close('Hm, I can not find details for selectedSKUId. Good bye.');
  }
  conv.data.purchasedItemSku = selectedSKU;
  conv.ask('Great! Here you go.');
  conv.ask(new CompletePurchase({
    skuId: {
      skuType: selectedSKU.skuId.skuType,
      id: selectedSKU.skuId.id,
      packageName: selectedSKU.skuId.packageName,
    },
  }));
});
`, parserOptions: parserOptions,
    },
  ],
  invalid: [
    {
      code: `
const app = actionssdk();
app.intent('foo', (conv) => {
})`, parserOptions: parserOptions, errors: [error],
    },
    {
      code: `
const app = actionssdk();

app.intent('foo', (conv) => {
  if (a) {

  } else {
    conv.ask('hello');
  }
})`, parserOptions: parserOptions, errors: [error],
    },
    {
      code: `
const app = dialogflow();

app.intent('x', (conv) => {
  conv.ask('hello');
});
app.intent('y', (conv) => {
});
app.intent('z', (conv) => {
  conv.ask('hello');
});`,
      parserOptions: parserOptions,
      errors: [error],
    },
  ],
});
