'use strict';

/**
 * validation.js
 *
 * Centralised input-validation helpers so that route handlers stay thin
 * and validation logic is independently testable.
 */

const MIN_VALUE  = 1;
const MAX_VALUE  = 3999;
const MAX_RAW_LEN = 20;

/**
 * Parse and validate a single query integer (the `?query=` parameter).
 *
 * @param {string|undefined} raw - Raw query-string value.
 * @returns {{ value: number }|{ error: string, status: number }}
 */
function validateSingleQuery(raw) {
  if (raw === undefined || raw === '') {
    return { error: 'Missing required query parameter: query', status: 400 };
  }

  if (raw.length > MAX_RAW_LEN) {
    return { error: 'Invalid value: input too long', status: 400 };
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return {
      error: `Invalid value "${raw}": must be a whole number (no decimals or special characters)`,
      status: 400,
    };
  }

  if (parsed < MIN_VALUE || parsed > MAX_VALUE) {
    return {
      error: `Value ${parsed} is out of range. Supported range: ${MIN_VALUE}–${MAX_VALUE}`,
      status: 422,
    };
  }

  return { value: parsed };
}

/**
 * Parse and validate the `?min=` and `?max=` parameters for range queries.
 *
 * @param {string|undefined} rawMin
 * @param {string|undefined} rawMax
 * @returns {{ min: number, max: number }|{ error: string, status: number }}
 */
function validateRangeQuery(rawMin, rawMax) {
  if (rawMin === undefined || rawMin === '') {
    return { error: 'Missing required query parameter: min', status: 400 };
  }

  if (rawMax === undefined || rawMax === '') {
    return { error: 'Missing required query parameter: max', status: 400 };
  }

  if (rawMin.length > MAX_RAW_LEN) {
    return { error: 'Invalid min value: input too long', status: 400 };
  }

  if (rawMax.length > MAX_RAW_LEN) {
    return { error: 'Invalid max value: input too long', status: 400 };
  }

  const min = Number(rawMin);
  const max = Number(rawMax);

  if (!Number.isFinite(min) || !Number.isInteger(min)) {
    return {
      error: `Invalid min value "${rawMin}": must be a whole number`,
      status: 400,
    };
  }

  if (!Number.isFinite(max) || !Number.isInteger(max)) {
    return {
      error: `Invalid max value "${rawMax}": must be a whole number`,
      status: 400,
    };
  }

  if (min < MIN_VALUE || min > MAX_VALUE) {
    return {
      error: `min value ${min} is out of range. Supported range: ${MIN_VALUE}–${MAX_VALUE}`,
      status: 422,
    };
  }

  if (max < MIN_VALUE || max > MAX_VALUE) {
    return {
      error: `max value ${max} is out of range. Supported range: ${MIN_VALUE}–${MAX_VALUE}`,
      status: 422,
    };
  }

  if (min >= max) {
    return {
      error: `min (${min}) must be strictly less than max (${max})`,
      status: 422,
    };
  }

  return { min, max };
}

module.exports = { validateSingleQuery, validateRangeQuery };
