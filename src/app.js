'use strict';

const crypto    = require('crypto');
const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { metricsMiddleware } = require('./metrics');
const opsRouter = require('./ops-router');
const router    = require('./router');
const logger    = require('./logger');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Propagate caller-supplied request ID or generate a new one for every request.
// Attaching it to the response header lets callers correlate logs with requests.
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use(helmet());

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  // Health and metrics probes must never be rate-limited.
  skip: (req) => req.path === '/health' || req.path === '/metrics',
}));

// Instrument every request with Prometheus counters and duration histograms.
app.use(metricsMiddleware);

// Structured access log — includes request ID for log correlation.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId:  req.id,
      method:     req.method,
      url:        req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    }, 'request');
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/', opsRouter);   // /health, /metrics
app.use('/', router);      // /romannumeral

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
  logger.error({ requestId: req.id, err }, 'Unhandled error');
  res.status(500).type('text').send('Internal Server Error');
});

module.exports = app;
