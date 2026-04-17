'use strict';

const express          = require('express');
const { register }     = require('./metrics');

const router = express.Router();

// Liveness / readiness probe — used by Docker HEALTHCHECK and Kubernetes probes.
router.get('/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Prometheus scrape endpoint — consumed by Prometheus (or any compatible agent).
router.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

module.exports = router;
