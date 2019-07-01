# The response returned by Actions on Google fulfillment must have <=2 simple responses. (at-most-two-simple-responses)

The response returned by Actions on Google fulfillment must have <=2 simple responses (i.e. chat bubbles) per turn.

## Rule Details

This rule aims to alert developers when an intent handler returns a response containing more than 2 simple responses.

Examples of **incorrect** code for this rule:

```js
const {dialogflow} = require('actions-on-google');
const app = dialogflow();
app.intent('foo', (conv) => {
  conv.ask('1');
  conv.ask('2');
  conv.ask('3'); // this is the 3rd simple response, so will throw an error at runtime
})
```

Examples of **correct** code for this rule:

```js
const {dialogflow} = require('actions-on-google');
const app = dialogflow();
app.intent('foo', (conv) => {
  conv.ask('1');
  conv.ask('2');
})
```

## Implementation Details

Implementation finds AST nodes that correspond to an Actions on Google client library response building call - either
`conv.ask` or `conv.close`. For those nodes, linter checks if one of its arguments contain a simple response and increments a counter
, if so.

## Further Reading

* Official Actions on Google responses [documentation](https://developers.google.com/actions/assistant/responses#simple_response).
