# The intent handler in Actions on Google fulfillment must return a client library response. (must-return-response)

The webhook must return an Actions on Google payload. Otherwise, the app will crash at runtime.

## Rule Details

This rule aims to alert developers when they forget to build an Actions on Google response in one of their
intent handlers.

Examples of **incorrect** code for this rule:

```js
const app = actionssdk();
app.intent('foo', (conv) => {
})
```

Examples of **correct** code for this rule:

```js
const app = actionssdk();
app.intent('foo', (conv) => {
  conv.ask('must return a response');
})
```

## Implementation Details

Linter checks for absense of Actions on Google client library response building calls - i.e. `conv.ask` or `conv.close` - inside
of intent handlers. Intent handlers correspond to `ArrowFunctionExpression` or `FunctionDeclaration` that are arguments to `app.intent` `CallExpression`.

## Further Reading

* [Debugging Common Actions on Google Errors](https://medium.com/google-developers/debugging-common-actions-on-google-errors-7c8527378d27). See "Error handling with the client library" section.
