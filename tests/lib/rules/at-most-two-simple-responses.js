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
 * @fileoverview Tests for lib/rules/at-most-two-simple-responses
 */
'use strict';

// -----------------------------------------------------------------------------
// Requirements
// -----------------------------------------------------------------------------

const rule = require('../../../lib/rules/at-most-two-simple-responses');

const RuleTester = require('eslint').RuleTester;

const err = {
  'at-most-two-simple-responses': {
    message: 'At most two simple responses are allowed.',
  },
};

const parserOptions = {ecmaVersion: 8};

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const ruleTester = new RuleTester();
ruleTester.run('at-most-two-simple-responses', rule, {
  valid: [
    {
      code: `game.ask(conv, null, 'ssmlPrompt', true);`,
      parserOptions: parserOptions,
    },
    {
      code: `
app.intent(['Repeat Slowly', 'What Do You Mean'], (conv) => {
  logger.info(\`Repeat Slowly: conv.data.lastResponse\`);
  if (game.hasContext(conv, 'lobby')) {
    logger.info('lobby');
    game.setContext(conv, 'lobby', game.CONTEXT_LIFETIME);
    return game.lobby(conv, false);
  }
  if (conv.data.lastResponse) {
    let ssmlPrompt = conv.data.lastResponse.replace(
      /\\. /g, \`.game.SSML_BREAK_SHORT \`);
    ssmlPrompt = ssmlPrompt.replace(/, /g, \`,game.SSML_BREAK_SHORT \`);
    game.ask(conv, null, \`ssmlPrompt\`, true);
  } else if (game.hasFoundItems(conv)) {
    let ssmlPrompt = game.makeRoomPromptResponse(conv).replace(
      /\\. /g, \`.game.SSML_BREAK_SHORT \`);
    ssmlPrompt = ssmlPrompt.replace(/, /g, \`,game.SSML_BREAK_SHORT \`);
    game.ask(conv, null, \`ssmlPrompt\`, true);
  } else {
    game.ask(conv, null, \`utils.getRandomPrompt(conv,
            'walls') utils.getRandomPrompt(conv, 'which_direction')\`, true);
  }
  game.askSuggestions(conv);
});`, parserOptions: parserOptions,
    },
    {
      code: `
      function fuzzy() {
        console.log('f');
      }
      app.intent('asdas', (conv) => {
        conv.ask(fuzzy());
      });
      `, parserOptions: parserOptions,
    },
    {
      code: `
function f() {
  if (!value) {
    conv.ask('I cannot find this.');
    conv.ask('How about something else?');
    return
  }
  conv.ask('Your value is ' + value)
}`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent('a', (conv) => {
  try {
    conv.ask('first');
  } catch (e) {\
    conv.ask('second');
  } finally {
    conv.ask('third');
  }
});
`, parserOptions: parserOptions,
    },
    {
      code: `
app.intent(INTENTS.B, async (conv) => {
  const some_cond = await doSomething();
  if (some_cond) {
    f1();
  }
  f2();
  f3();
  conv.ask('Leaving intent B (no enter)');
});
`, parserOptions: parserOptions,
    },
    {
      code: `
function handler(conv) {
  if (a) {
    conv.ask('foo');
  } else if (b) {\
    conv.ask('bar');
    return;
  }\
  conv.ask('baz');
}`,
    },
    {
      code: `
function handler(conv) {
  if (a) {
    conv.ask('foo');
    conv.ask('bar');
    return;
  }
  conv.ask('hello');
}`,
    },
    {
      code:
`conv.ask('one');
conv.ask('two');
conv.ask(createSimpleResponse());
/**
 * Helper to create a string response.
 * @return {string} simple response
 */
function createSimpleResponse() {
  return 'another one';
}`,
    },
    {
      code: `
/**
 * Helper to create a string response.
 * @return {string} simple response
 */
function createSimpleResponse() {
  return 'another one';
}
conv.ask('one');\
conv.ask('two');\
conv.ask(createSimpleResponse());
`,
    },
    {
      code: `
conv.ask('one');
conv.ask('two');`,
      parserOptions: parserOptions,
    },
    {
      code:
`conv.ask(new SimpleResponse('one'));
conv.ask(createSimpleResponse());
/**
 * @return {string|number}
 */
function createSimpleResponse() {

}`, parserOptions: parserOptions,
    },
    {
      code:
`if (a) {
  conv.ask('one');
  conv.ask('two');
} else {
  conv.close('three');
}`,
      parserOptions: parserOptions,
    },
    {
      code:
`if (a) {
  conv.ask('one');
} else {
  conv.ask('two');
}
conv.ask('three');
`, parserOptions: parserOptions,
    },
    {code:
`app.intent('Default Welcome Intent', (conv) => {
  return fetch(URL)
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.statusText);
      } else {
        return response.json();
      }
    })
    .then((json) => {
      const data = json.data[Math.floor(Math.random() * json.data.length)];
      const randomQuote =
        data.quotes[Math.floor(Math.random() * data.quotes.length)];
      conv.close(new SimpleResponse({
        text: json.info,
        speech: 'data.author, from Google ' +
          'Developer Relations once said... randomQuote',
      }));
      if (conv.screen) {
        conv.close(new BasicCard({
          text: randomQuote,
          title: 'data.author once said...',
          image: new Image({
            url: BACKGROUND_IMAGE,
            alt: 'DevRel Quote',
          }),
        }));
      }
    });
});
`, parserOptions: parserOptions,
    },
    {
      code: `
if (arg.purchaseStatus === 'PURCHASE_STATUS_ITEM_CHANGE_REQUESTED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Looks like youve changed your mind.' +
    ' Would you like to try again?');
} else if (arg.purchaseStatus === 'PURCHASE_STATUS_USER_CANCELLED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Looks like youve cancelled the purchase.' +
    ' Do you still want to try to do a purchase?');
} else if (arg.purchaseStatus === 'PURCHASE_STATUS_ERROR'
  || arg.purchaseStatus === 'PURCHASE_STATUS_UNSPECIFIED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Purchase Failed:' + arg.purchaseStatus);
  conv.ask('Do you want to try again?');
}
`, parserOptions: parserOptions,
    },
    {
      code:
`
const handleLobby = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  lobby(conv, false);
};
`, parserOptions: parserOptions,
    },
    {code:
`
const handleLobby = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  lobby(conv, false);
};
const handleLobby2 = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
        <par>
        <media xml:id='confirmation' begin='0.0s'>
      <speak>'confirmation'</speak>
      </media>
      <media xml:id='lobbySound' begin='confirmation.end+0.0s' soundLevel='0dB'>
      <audio
      src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
      </media>
      </par>
      </speak>\`,
      text: 'confirmation',
    }));
reset(conv);
lobby(conv, false);
};
const handleLobby3 = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  lobby(conv, false);
};
  `, parserOptions: parserOptions,
    },
    {
      code: `
  const eventDay = {
    first: {
      start: moment.tz('2018-05-08 00:00', timezone),
      end: moment.tz('2018-05-08 23:59', timezone),
    },
    second: {
      start: moment.tz('2018-05-09 00:00', timezone),
      end: moment.tz('2018-05-09 23:59', timezone),
    },
    third: {
      start: moment.tz('2018-05-10 00:00', timezone),
      end: moment.tz('2018-05-10 17:00', timezone),
    },
  };

  const keynote = {
    google: {
      start: moment.tz('2018-05-08 10:00', timezone),
      end: moment.tz('2018-05-08 11:30', timezone),
    },
    developer: {
      start: moment.tz('2018-05-09 12:45', timezone),
      end: moment.tz('2018-05-09 13:45', timezone),
    },
  };
// Gets the day of the event given a timestamp
const getDay = (timestamp) => {
  let day = 0;
  if (!timestamp) return day;
  if (isFirstDay(timestamp)) {
    day = 1;
  } else if (isSecondDay(timestamp)) {
    day = 2;
  } else if (isThirdDay(timestamp)) {
    day = 3;
  }
  return day;
};

const isFirstDay = (timestamp) => {
  if (!timestamp) return false;
  const date = moment(timestamp).tz(timezone);
  return date.isBetween(eventDay.first.start, eventDay.first.end);
};
const isSecondDay = (timestamp) => {
  if (!timestamp) return false;
  const date = moment(timestamp).tz(timezone);
  return date.isBetween(eventDay.second.start, eventDay.second.end);
};
const isThirdDay = (timestamp) => {
  if (!timestamp) return false;
  const date = moment(timestamp).tz(timezone);
  return date.isBetween(eventDay.third.start, eventDay.third.end);
};
const getMoment = (timestamp) => moment(timestamp).tz(timezone);
`, parserOptions: parserOptions,
    },
    // not allowing non-conv names, so dont keep tracker for those.
    {
      code:
`
  app.intent('foo', conversation => {
    conversation.close('one');
    conversation.close('two');
    conversation.close('three');
  })
`, parserOptions: parserOptions,
    },
  ],
  invalid: [
    {
      code:
`
const handleLobby = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  conv.ask('second');
  conv.ask('third');
  lobby(conv, false);
};
`,
      parserOptions: parserOptions,
      errors: [err['at-most-two-simple-responses']],
    },
    {code:
`
const handleLobby = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  conv.ask('second');
  conv.ask('third');
  lobby(conv, false);
};
const handleLobby2 = (conv) => {
  const confirmation = getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: \`<speak>
      <par>
        <media xml:id='confirmation' begin='0.0s'>
          <speak>'confirmation'</speak>
        </media>
        <media xml:id='lobbySound' begin='confirmation.end+0.0s'
         soundLevel='0dB'>
          <audio
            src='https://actions.google.com/sounds/v1/foley/swoosh.ogg'/>
        </media>
      </par>
    </speak>\`,
    text: 'confirmation',
  }));
  reset(conv);
  conv.ask('second');
  conv.ask('third');
  lobby(conv, false);
};
`,
    parserOptions: parserOptions,
    errors: [
      err['at-most-two-simple-responses'],
      err['at-most-two-simple-responses'],
    ],
    },
    {
      code: 'conv.ask(\'one\'); conv.ask(\'two\'); conv.ask(\'three\');',
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code: `
conv.ask('one'); conv.ask('two');
if (ok) {
  conv.ask('three');
}`,
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code:
`
if (ok) {
  conv.ask('three');
}
conv.ask('one'); conv.ask('two');
`,
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code:
`
if (a) {
  conv.ask('one');
  conv.ask('two');
} else {
  conv.close('three');
}
if (b) conv.close('four');
conv.close('five');
`,
      errors: [
        err['at-most-two-simple-responses'],
        err['at-most-two-simple-responses'],
      ],
    },
    {
      code:
`
app.intent('Default Welcome Intent', (conv) => {
  return fetch(URL)
    .then((response) => {
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.statusText);
      } else {
        return response.json();
      }
    })
    .then((json) => {
      const data = json.data[Math.floor(Math.random() * json.data.length)];
      const randomQuote =
        data.quotes[Math.floor(Math.random() * data.quotes.length)];
      conv.close(new SimpleResponse({
        text: json.info,
        speech: 'data.author, from Google ' +
          'Developer Relations once said... randomQuote',
      }));
      conv.close(new SimpleResponse({
        text: json.info,
        speech: 'data.author, from Google ' +
          'Developer Relations once said... randomQuote',
      }));
      conv.close(new SimpleResponse({
        text: json.info,
        speech: 'data.author, from Google ' +
          'Developer Relations once said... randomQuote',
      }));
      if (conv.screen) {
        conv.close(new BasicCard({
          text: randomQuote,
          title: 'data.author once said...',
          image: new Image({
            url: BACKGROUND_IMAGE,
            alt: 'DevRel Quote',
          }),
        }));
      }
    });
});
`,
      parserOptions: parserOptions,
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code:
`
if (arg.purchaseStatus === 'PURCHASE_STATUS_ITEM_CHANGE_REQUESTED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Looks like youve changed your mind.' +
    ' Would you like to try again?');
} else if (arg.purchaseStatus === 'PURCHASE_STATUS_USER_CANCELLED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Looks like youve cancelled the purchase.' +
    ' Do you still want to try to do a purchase?');
} else if (arg.purchaseStatus === 'PURCHASE_STATUS_ERROR'
  || arg.purchaseStatus === 'PURCHASE_STATUS_UNSPECIFIED') {
  conv.contexts.set(BUILD_ORDER_CONTEXT, BUILD_ORDER_LIFETIME);
  conv.ask('Purchase Failed:' + arg.purchaseStatus);
  conv.ask('Do you want to try again?');
}
conv.ask('hello');
`,
      errors: [err['at-most-two-simple-responses']],
      parserOptions: parserOptions,
    },
    {
      code: `
    function handler(conv) {
      if (a) {
        conv.ask('foo');
      } else if (b) {
        conv.ask('bar');
        return;
      }
      conv.ask('baz');
      conv.ask('one');
    }`,
      errors: [err['at-most-two-simple-responses']],
      parserOptions: parserOptions,
    },
    {
      code: `
app.intent('a', (conv) => {
  try {
    conv.ask('first');
    conv.ask('fourth');
  } catch (e) {
    conv.ask('second');
  } finally {
    conv.ask('third');
  }
});
`,
      parserOptions: parserOptions,
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code: `
  app.intent('a', (conv) => {
    try {
      conv.ask('first');
    } catch (e) {
      conv.ask('second');
      conv.ask('fourth');
    } finally {
      conv.ask('third');
    }
  });
  `,
      parserOptions: parserOptions,
      errors: [err['at-most-two-simple-responses']],
    },
    {
      code:
`
app.intent('a', (conv) => {
  try {
    conv.ask('first');
  } finally {
    conv.ask('third');
    conv.ask('fourth');
  }
});
`,
      parserOptions: parserOptions,
      errors: [err['at-most-two-simple-responses']],
    },
  ]}
);
