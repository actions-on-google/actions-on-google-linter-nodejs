# eslint-plugin-actions-on-google

This repository provides implementation of rules to check for common errors in response
generation inside of your webhook code on Actions on Google platform using the official
Actions on Google Node.js [client library](https://github.com/actions-on-google/actions-on-google-nodejs).

[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-actions-on-google.svg)](https://www.npmjs.org/package/eslint-plugin-actions-on-google)

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-actions-on-google`:

```
$ npm install eslint-plugin-actions-on-google --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-actions-on-google` globally.

## Usage

Add `actions-on-google` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "actions-on-google"
    ]
}
```


Then configure the rules you want to use under the rules section. In the snippet below, `rule-name` is a placeholder value for an actual name of a rule)


```json
{
    "rules": {
        "actions-on-google/rule-name": "error"
    }
}
```

## Supported Rules

* always-return-promise
  * If intent handler uses a Promise, it must return it.
* at-most-two-simple-responses
  * The response returned by Actions on Google fulfillment must have <=2 simple responses per turn.
* first-item-simple-response-or-helper
  * The first item in webhook response must be a simple response, or a helper
* must-return-response
  * The response returned by Actions on Google fulfillment must return a client library response.

For source code of the rules refer to `lib/rules/`

## References & Issues

* Questions? Go to [StackOverflow](https://stackoverflow.com/questions/tagged/actions-on-google), [Assistant Developer Community on Reddit](https://www.reddit.com/r/GoogleAssistantDev/) or [Support](https://developers.google.com/actions/support/).
* For bugs, please report an [issue](https://github.com/actions-on-google/actions-on-google-linter-nodejs/issues) on Github.
* Actions on Google [documentation](https://developers.google.com/actions/extending-the-assistant/?utm_source=actions-on-google-linter-nodejs)
* Actions on Google response generation rules [documentation](https://developers.google.com/actions/assistant/responses/?utm_source=actions-on-google-linter-nodejs)

## Make Contributions

Please read and follow the steps in the [CONTRIBUTING.md](CONTRIBUTING.md).

## Developer's Guide

The plugin was implemented using the official ESLint [guide](https://eslint.org/docs/developer-guide/working-with-plugins). Please refer to those docs on how to get started with writing new rules.

The rules were created based on:
* The official Actions on Google Responses [documentation](https://developers.google.com/actions/assistant/responses/?utm_source=actions-on-google-linter-nodejs).
* The most common issues reported by developers

Most of the rules regarding the Actions on Google response generation has to do with:
* How many of a kind the final response contains. For example, it's only allowed to have at most 2 simple responses, or
at most 8 suggestions chips.
* Was something returned or not. For example, suggestion chips are not allowed in a FinalResponse.
Please refer for a full list of rules in the [documentation](https://developers.google.com/actions/assistant/responses/?utm_source=actions-on-google-linter-nodejs).

As such, we implemented useful library modules to assist with those 2 tasks, located in count-scope-manager and presence-scope-manager. Additionally, we provide library for classifying simple and helper responses.
Together those modules can be reused to create more rules.

**Note**
* Performing robust checks is difficult on a dynamically typed language, such as JavaScript. As such, linter is not guaranteed to raise 100% of the issues in your code. However, we provide guarantees that those errors reported by the linter
are valid.
* Linter entirely relies on the Action code written using Actions on Google Node.js [client library](https://github.com/actions-on-google/actions-on-google-nodejs).

## License

See [LICENSE](LICENSE).

## Terms

Your use of this sample is subject to, and by using or downloading the sample files you agree to comply with, the [Google APIs Terms of Service](https://developers.google.com/terms/).
