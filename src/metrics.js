'use strict';

const client = require('prom-client');

// Use an explicit registry (not the global default) so tests stay isolated.
const register = new client.Registry();

// Built-in Node.js process metrics: CPU, memory, GC, event-loop lag, etc.
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name:       'http_requests_total',
  help:       'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers:  [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name:       'http_request_duration_seconds',
  help:       'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets sized for a fast in-process service (sub-millisecond to 1 second).
  buckets:    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers:  [register],
});

function metricsMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - startNs) / 1e9;
    // Use the matched route path to avoid high-cardinality labels from full URLs.
    const route = req.route?.path ?? 'unmatched';
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSec);
  });
  next();
}

module.exports = { register, metricsMiddleware };
