'use strict';

/**
 * app.js
 *
 * Creates and configures the Express application.
 * Kept separate from server.js so that tests can import the app
 * without binding to a port.
 */

const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const router    = require('./router');
const logger    = require('./logger');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(helmet());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Request-level access logging (method, url, status, response time).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method:     req.method,
        url:        req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'request'
    );
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/', router);

// ---------------------------------------------------------------------------
// 404 catch-all (must be after all routes)
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).type('text').send('Not Found');
});

// ---------------------------------------------------------------------------
// Global error handler (must have 4 params for Express to treat as error handler)
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).type('text').send('Internal Server Error');
});

module.exports = app;
