'use strict';

/**
 * logger.js
 *
 * Thin wrapper around pino – a structured, low-overhead JSON logger.
 * Using a single shared instance keeps log configuration in one place
 * and makes it easy to swap transports (e.g. add log shipping) later.
 *
 * Log level is driven by the LOG_LEVEL environment variable so that it can
 * be set to "debug" in development and "warn" in production without a code
 * change.
 */

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Pretty-print only in non-production environments to keep prod logs
  // machine-parseable JSON.
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

module.exports = logger;
