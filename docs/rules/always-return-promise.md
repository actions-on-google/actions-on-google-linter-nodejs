# The intent handler in Actions on Google fulfillment needs to return a promise, if there is any. (always-return-promise)

This rule aims to alert developers when the intent handler in their webhook uses a Promise, but doesn't return it.

## Rule Details

If an intent handler uses a Promise to make async calls, it must return a Promise in order to ensure the client library properly
constructs the response.

Examples of **incorrect** code for this rule:

```js
const {dialogflow} = require('actions-on-google');
const app = dialogflow();
app.intent('foo', (conv) => {
  doAsync().then(res => {
    conv.ask('hello');
  });
})
```

Examples of **correct** code for this rule:

```js
const {dialogflow} = require('actions-on-google');
const app = dialogflow();
app.intent('foo', (conv) => {
  return doAsync().then(res => {
    conv.ask('hello');
  });
})
```

## Implementation Details

This rule checks for presence of a Promise in an intent handler, and makes sure it's in the subtree of the `ReturnStatement`
node in the ESLint AST.

## Further Reading

* [Debugging Common Actions on Google Errors](https://medium.com/google-developers/debugging-common-actions-on-google-errors-7c8527378d27). See "Error handling with the client library" section.
