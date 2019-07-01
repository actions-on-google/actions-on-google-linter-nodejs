# The first item in webhook response must be a simple response, or a helper. (first-item-simple-or-helper-response)

The first item in webhook response must be a simple response, or a helper.
Please consult the official [docs](https://developers.google.com/actions/assistant/responses#rich_responses).

## Rule Details

This rule aims to alert developers when an intent handler returns a response which doesn't have a simple response or a helper as the first item.

Examples of **incorrect** code for this rule:

```js
app.intent('foo', function(conv) {
  conv.ask(new BasicCard());
  conv.ask('this is a simple response');
});
```

Examples of **correct** code for this rule:

```js
// first item is a helper
app.intent('foo', function(conv) {
  conv.ask(new SignIn());
  conv.ask(new BasicCard());
});
// first item is a simple response
app.intent('foo', function(conv) {
  conv.ask('this is a simple response');
  conv.ask(new BasicCard());
});
```

## Implementation Details

Implementation finds AST nodes that correspond to an Actions on Google client library response building call - either
`conv.ask` or `conv.close`. For those nodes, linter checks if those nodes are inside an intent handler (i.e. `app.intent`) and will check the first argument of the response building call.

As such, this is limited to intent handler functions (i.e. (conv) => {...}) declared as part of an intent handler definition (i.e. app.intent). The rule will not report anything for other cases.

## Further Reading

* Official Actions on Google responses [documentation](https://developers.google.com/actions/assistant/responses#rich_responses).
* [Debugging Common Actions on Google Errors](https://medium.com/google-developers/debugging-common-actions-on-google-errors-7c8527378d27). See "Error handling with the client library" section.
