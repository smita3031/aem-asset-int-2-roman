'use strict';

/**
 * roman-numeral.test.js
 *
 * Full test suite covering:
 *   1. Unit tests – converter.js  (happy path, edges, errors)
 *   2. Unit tests – validation.js (single & range parameter validation)
 *   3. Integration tests – HTTP endpoints via supertest
 */

const request = require('supertest');
const app     = require('../src/app');
const { toRoman }                           = require('../src/converter');
const { validateSingleQuery, validateRangeQuery } = require('../src/validation');

// ==========================================================================
// 1. Unit tests: toRoman()
// ==========================================================================
describe('toRoman() – converter unit tests', () => {

  // ---- Happy path: canonical values ----------------------------------------
  describe('known conversions', () => {
    const cases = [
      [1,    'I'],
      [2,    'II'],
      [3,    'III'],
      [4,    'IV'],
      [5,    'V'],
      [6,    'VI'],
      [9,    'IX'],
      [10,   'X'],
      [14,   'XIV'],
      [40,   'XL'],
      [49,   'XLIX'],
      [50,   'L'],
      [90,   'XC'],
      [99,   'XCIX'],
      [100,  'C'],
      [400,  'CD'],
      [500,  'D'],
      [900,  'CM'],
      [1000, 'M'],
      [1994, 'MCMXCIV'],
      [2024, 'MMXXIV'],
      [3549, 'MMMDXLIX'],
    ];

    test.each(cases)('toRoman(%i) === "%s"', (input, expected) => {
      expect(toRoman(input)).toBe(expected);
    });
  });

  // ---- Edge cases: boundary values -----------------------------------------
  describe('boundary values', () => {
    test('minimum value 1 returns "I"', () => {
      expect(toRoman(1)).toBe('I');
    });

    test('maximum value 3999 returns "MMMCMXCIX"', () => {
      expect(toRoman(3999)).toBe('MMMCMXCIX');
    });
  });

  // ---- Error cases ---------------------------------------------------------
  describe('invalid inputs throw', () => {
    test('0 throws RangeError', () => {
      expect(() => toRoman(0)).toThrow(RangeError);
    });

    test('4000 throws RangeError', () => {
      expect(() => toRoman(4000)).toThrow(RangeError);
    });

    test('-1 throws RangeError', () => {
      expect(() => toRoman(-1)).toThrow(RangeError);
    });

    test('float 1.5 throws TypeError', () => {
      expect(() => toRoman(1.5)).toThrow(TypeError);
    });

    test('NaN throws TypeError', () => {
      expect(() => toRoman(NaN)).toThrow(TypeError);
    });

    test('Infinity throws TypeError', () => {
      expect(() => toRoman(Infinity)).toThrow(TypeError);
    });

    test('string "V" throws TypeError', () => {
      expect(() => toRoman('V')).toThrow(TypeError);
    });
  });
});

// ==========================================================================
// 2. Unit tests: validation helpers
// ==========================================================================
describe('validateSingleQuery()', () => {

  test('valid integer returns { value }', () => {
    expect(validateSingleQuery('10')).toEqual({ value: 10 });
  });

  test('undefined returns 400 error', () => {
    const r = validateSingleQuery(undefined);
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/missing/i);
  });

  test('empty string returns 400 error', () => {
    const r = validateSingleQuery('');
    expect(r.status).toBe(400);
  });

  test('non-numeric string returns 400 error', () => {
    const r = validateSingleQuery('abc');
    expect(r.status).toBe(400);
  });

  test('float string returns 400 error', () => {
    const r = validateSingleQuery('3.5');
    expect(r.status).toBe(400);
  });

  test('0 returns 422 error', () => {
    const r = validateSingleQuery('0');
    expect(r.status).toBe(422);
  });

  test('4000 returns 422 error', () => {
    const r = validateSingleQuery('4000');
    expect(r.status).toBe(422);
  });

  test('3999 is valid', () => {
    expect(validateSingleQuery('3999')).toEqual({ value: 3999 });
  });
});

describe('validateRangeQuery()', () => {

  test('valid min & max returns { min, max }', () => {
    expect(validateRangeQuery('1', '3')).toEqual({ min: 1, max: 3 });
  });

  test('missing min returns 400', () => {
    expect(validateRangeQuery(undefined, '5').status).toBe(400);
  });

  test('missing max returns 400', () => {
    expect(validateRangeQuery('1', undefined).status).toBe(400);
  });

  test('min >= max returns 422', () => {
    expect(validateRangeQuery('5', '5').status).toBe(422);
    expect(validateRangeQuery('5', '3').status).toBe(422);
  });

  test('min out of range returns 422', () => {
    expect(validateRangeQuery('0', '5').status).toBe(422);
  });

  test('max out of range returns 422', () => {
    expect(validateRangeQuery('1', '4000').status).toBe(422);
  });

  test('non-numeric min returns 400', () => {
    expect(validateRangeQuery('abc', '5').status).toBe(400);
  });
});

// ==========================================================================
// 3. Integration tests: HTTP endpoints
// ==========================================================================
describe('GET /romannumeral – integration tests', () => {

  // ---- Single query --------------------------------------------------------
  describe('?query= (single conversion)', () => {

    test('200 with correct JSON for query=1', async () => {
      const res = await request(app).get('/romannumeral?query=1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ input: '1', output: 'I' });
    });

    test('200 with correct JSON for query=3999', async () => {
      const res = await request(app).get('/romannumeral?query=3999');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ input: '3999', output: 'MMMCMXCIX' });
    });

    test('200 for query=2024 returns MMXXIV', async () => {
      const res = await request(app).get('/romannumeral?query=2024');
      expect(res.status).toBe(200);
      expect(res.body.output).toBe('MMXXIV');
    });

    test('response Content-Type is application/json', async () => {
      const res = await request(app).get('/romannumeral?query=5');
      expect(res.headers['content-type']).toMatch(/json/);
    });

    test('400 when query param is missing', async () => {
      const res = await request(app).get('/romannumeral');
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/missing/i);
    });

    test('400 when query is a non-numeric string', async () => {
      const res = await request(app).get('/romannumeral?query=abc');
      expect(res.status).toBe(400);
    });

    test('400 when query is a float', async () => {
      const res = await request(app).get('/romannumeral?query=3.14');
      expect(res.status).toBe(400);
    });

    test('422 when query=0 (below range)', async () => {
      const res = await request(app).get('/romannumeral?query=0');
      expect(res.status).toBe(422);
    });

    test('422 when query=4000 (above range)', async () => {
      const res = await request(app).get('/romannumeral?query=4000');
      expect(res.status).toBe(422);
    });

    test('422 when query is negative', async () => {
      const res = await request(app).get('/romannumeral?query=-5');
      expect(res.status).toBe(422);
    });
  });

  // ---- Range query ---------------------------------------------------------
  describe('?min=&max= (range conversion)', () => {

    test('200 with correct conversions array for min=1&max=3', async () => {
      const res = await request(app).get('/romannumeral?min=1&max=3');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        conversions: [
          { input: '1', output: 'I'   },
          { input: '2', output: 'II'  },
          { input: '3', output: 'III' },
        ],
      });
    });

    test('results are in ascending order', async () => {
      const res = await request(app).get('/romannumeral?min=8&max=12');
      expect(res.status).toBe(200);
      const inputs = res.body.conversions.map((c) => Number(c.input));
      for (let i = 1; i < inputs.length; i++) {
        expect(inputs[i]).toBeGreaterThan(inputs[i - 1]);
      }
    });

    test('correct count: max - min + 1 entries', async () => {
      const res = await request(app).get('/romannumeral?min=10&max=20');
      expect(res.body.conversions).toHaveLength(11);
    });

    test('400 when min is missing', async () => {
      const res = await request(app).get('/romannumeral?max=5');
      expect(res.status).toBe(400);
    });

    test('400 when max is missing', async () => {
      const res = await request(app).get('/romannumeral?min=1');
      expect(res.status).toBe(400);
    });

    test('422 when min >= max', async () => {
      const res = await request(app).get('/romannumeral?min=5&max=5');
      expect(res.status).toBe(422);
    });

    test('422 when min=0 (out of range)', async () => {
      const res = await request(app).get('/romannumeral?min=0&max=5');
      expect(res.status).toBe(422);
    });

    test('422 when max=4000 (out of range)', async () => {
      const res = await request(app).get('/romannumeral?min=1&max=4000');
      expect(res.status).toBe(422);
    });

    test('400 when min is non-numeric', async () => {
      const res = await request(app).get('/romannumeral?min=abc&max=5');
      expect(res.status).toBe(400);
    });
  });

  // ---- 404 catch-all -------------------------------------------------------
  describe('404 for unknown routes', () => {
    test('GET /unknown returns 404', async () => {
      const res = await request(app).get('/unknown');
      expect(res.status).toBe(404);
    });

    test('GET / returns 404', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(404);
    });
  });
});

// ==========================================================================
// 4. Ops endpoints
// ==========================================================================
describe('GET /health', () => {
  test('200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('response includes uptime (number) and timestamp (ISO string)', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.uptime).toBe('number');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  test('Content-Type is application/json', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('GET /metrics', () => {
  test('200 with Prometheus text format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  test('response contains http_requests_total metric', async () => {
    await request(app).get('/romannumeral?query=1');
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_requests_total');
  });

  test('response contains http_request_duration_seconds metric', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
