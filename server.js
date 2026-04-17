'use strict';

/**
 * server.js
 *
 * Entry point – binds the Express app to a TCP port and starts listening.
 * Separated from app.js so that integration tests can import the app
 * without accidentally opening a real socket.
 */

const app    = require('./app');
const logger = require('./logger');

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `Roman Numeral Service listening`);
});

// Graceful shutdown: allow in-flight requests to complete before exit.
function shutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, closing server…');
  const timer = setTimeout(() => {
    logger.warn('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10_000).unref();
  server.close(() => {
    clearTimeout(timer);
    logger.info('Server closed. Exiting.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = server; // exported for integration tests
