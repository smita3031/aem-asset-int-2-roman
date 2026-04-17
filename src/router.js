'use strict';

/**
 * router.js
 *
 * Defines the single route:  GET /romannumeral
 *
 * Handles two query-string signatures:
 *   1. Single conversion  →  ?query={integer}
 *   2. Range conversion   →  ?min={integer}&max={integer}
 *
 * The presence of `min` or `max` in the query string routes to the range
 * handler; otherwise, `query` is expected.
 */

const express  = require('express');
const logger   = require('./logger');
const { toRoman }                           = require('./converter');
const { validateSingleQuery, validateRangeQuery } = require('./validation');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /romannumeral
// ---------------------------------------------------------------------------
router.get('/romannumeral', (req, res) => {
  const { query, min, max } = req.query;

  // -- Route: range query --------------------------------------------------
  if (min !== undefined || max !== undefined) {
    return handleRangeQuery(req, res, min, max);
  }

  // -- Route: single query -------------------------------------------------
  return handleSingleQuery(req, res, query);
});

// ---------------------------------------------------------------------------
// Handler: single integer conversion
// ---------------------------------------------------------------------------
function handleSingleQuery(req, res, raw) {
  const validation = validateSingleQuery(raw);

  if (validation.error) {
    logger.warn({ path: req.path, error: validation.error }, 'Validation failed (single query)');
    return res.status(validation.status).type('text').send(validation.error);
  }

  const roman = toRoman(validation.value);
  logger.info({ input: validation.value, output: roman }, 'Single conversion');

  return res.status(200).json({
    input:  String(validation.value),
    output: roman,
  });
}

// ---------------------------------------------------------------------------
// Handler: range query  (async / parallel via Promise.all)
// ---------------------------------------------------------------------------
async function handleRangeQuery(req, res, rawMin, rawMax) {
  const validation = validateRangeQuery(rawMin, rawMax);

  if (validation.error) {
    logger.warn({ path: req.path, error: validation.error }, 'Validation failed (range query)');
    return res.status(validation.status).type('text').send(validation.error);
  }

  const { min, max } = validation;

  // Build an array of integers [min, min+1, …, max].
  const integers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // Convert each integer asynchronously in parallel.
  // Promise.resolve wraps the synchronous toRoman call so every computation
  // yields to the event loop and runs concurrently via the microtask queue.
  const conversions = await Promise.all(
    integers.map((n) =>
      Promise.resolve().then(() => ({
        input:  String(n),
        output: toRoman(n),
      }))
    )
  );

  // Results arrive in index-stable order from Promise.all, so they are
  // already ascending — no extra sort step needed.
  logger.info({ min, max, count: conversions.length }, 'Range conversion');

  return res.status(200).json({ conversions });
}

module.exports = router;
