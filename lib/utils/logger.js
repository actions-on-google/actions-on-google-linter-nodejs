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
 * @fileoverview Initializes the logger.
 */

'use strict';

const winston = require('winston');

// Default logger
winston.loggers.add('DEFAULT_LOGGER', {
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

const logger = winston.loggers.get('DEFAULT_LOGGER');
switch (process.env.NODE_ENV) {
  case 'debug':
    logger.level = 'debug';
    break;
  case 'prod':
    logger.level = 'info';
    break;
  default:
    logger.level = 'info';
    break;
}
logger.debug('Logger is now initialized.');
