# Roman Numeral Service

A production-quality HTTP microservice that converts integers to Roman numerals, built for the Adobe AEM Engineering Test (Revision 1.2).

![CI](https://github.com/<your-org>/<your-repo>/actions/workflows/ci.yml/badge.svg)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Reference](#api-reference)
3. [Engineering Methodology](#engineering-methodology)
4. [Testing Methodology](#testing-methodology)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Package Layout](#package-layout)
7. [Dependency Attribution](#dependency-attribution)
8. [Docker](#docker)
9. [Roman Numeral Specification](#roman-numeral-specification)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18.0.0
- npm ≥ 9.0.0

### Install & Run

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd roman-numeral-service

# 2. Install dependencies
npm install

# 3. Start the server (default port: 8080)
npm start
```

The server starts on **http://localhost:8080** by default.

You can override the port and log level with environment variables:

```bash
PORT=3000 LOG_LEVEL=debug npm start
```

### Verify it's working

```bash
curl "http://localhost:8080/romannumeral?query=2024"
# → {"input":"2024","output":"MMXXIV"}

curl "http://localhost:8080/romannumeral?min=1&max=5"
# → {"conversions":[{"input":"1","output":"I"},{"input":"2","output":"II"},{"input":"3","output":"III"},{"input":"4","output":"IV"},{"input":"5","output":"V"}]}
```

---

## API Reference

### Single Conversion

**`GET /romannumeral?query={integer}`**

| Parameter | Type    | Required | Description                        |
|-----------|---------|----------|------------------------------------|
| `query`   | integer | Yes      | Integer in the range **1 – 3999**  |

**Success – 200 OK**
```json
{
  "input": "14",
  "output": "XIV"
}
```

**Error – 400 Bad Request** (missing or non-integer parameter)
```
Invalid value "abc": must be a whole number (no decimals or special characters)
```

**Error – 422 Unprocessable Entity** (integer out of range)
```
Value 4000 is out of range. Supported range: 1–3999
```

---

### Range Conversion

**`GET /romannumeral?min={integer}&max={integer}`**

| Parameter | Type    | Required | Description                                     |
|-----------|---------|----------|-------------------------------------------------|
| `min`     | integer | Yes      | Lower bound (inclusive), range **1 – 3999**     |
| `max`     | integer | Yes      | Upper bound (inclusive), range **1 – 3999**     |

`min` must be strictly less than `max`. Results are returned in ascending order.

**Success – 200 OK**
```json
{
  "conversions": [
    { "input": "1", "output": "I"   },
    { "input": "2", "output": "II"  },
    { "input": "3", "output": "III" }
  ]
}
```

Error responses follow the same 400 / 422 pattern as the single-conversion endpoint.

---

## Engineering Methodology

### Conversion Algorithm

The Roman numeral algorithm is a **greedy descent** over a pre-built lookup table ordered from largest value to smallest:

```
1000→M, 900→CM, 500→D, 400→CD, 100→C, 90→XC,
50→L, 40→XL, 10→X, 9→IX, 5→V, 4→IV, 1→I
```

For each entry in the table, the algorithm repeatedly subtracts the entry's integer value from the remaining number and appends its Roman symbol(s) until the remaining number is smaller than the entry's value. Then it moves to the next smaller entry. This naturally handles all six subtractive pairs (IV, IX, XL, XC, CD, CM) because they are explicit entries in the table.

No third-party library is used for this logic. The algorithm is implemented from scratch in [`converter.js`](converter.js).

### Separation of Concerns

The codebase is split into focused modules:

| File | Responsibility |
|------|---------------|
| `converter.js` | Pure Roman numeral conversion logic |
| `validation.js` | Input parsing and validation |
| `router.js` | Express route handlers |
| `app.js` | Express app configuration (middleware, security headers, rate limiting, error handling) |
| `server.js` | TCP binding and graceful shutdown |
| `logger.js` | Structured JSON logging via pino |

`app.js` is deliberately decoupled from `server.js` so that integration tests can import the Express app without binding a real socket.

### Async / Parallel Range Processing (Extension 2)

Range queries use `Promise.all()` to schedule all conversions concurrently. Each integer is wrapped in `Promise.resolve().then(...)` so that every conversion is dispatched as a microtask, allowing the event loop to interleave work rather than blocking on a synchronous loop. `Promise.all` preserves insertion order, so the results are automatically returned in ascending order without a sort step.

### Error Handling

- **400 Bad Request** — parameter is missing, non-numeric, not a whole integer, or exceeds the maximum input length.
- **422 Unprocessable Entity** — parameter is a valid integer but falls outside `[1, 3999]`.
- **429 Too Many Requests** — rate limit exceeded (200 requests per minute per IP).
- **404 Not Found** — any unrecognised route.
- **500 Internal Server Error** — caught by the global Express error handler; full error is logged server-side only.
- All errors are returned as `text/plain` per the specification.

### Logging (Extension 3)

Structured JSON logging is provided by **pino**, one of the fastest Node.js loggers. Every request is logged with method, URL, status code, and response time. In non-production environments (`NODE_ENV !== 'production'`), pino-pretty renders coloured, human-readable output. In production, raw JSON is emitted for ingestion by log aggregators (e.g. Datadog, Splunk, CloudWatch).

Set the `LOG_LEVEL` environment variable to `debug`, `info`, `warn`, `error`, or `fatal`.

---

## Testing Methodology

Tests are written with **Jest** and **supertest**. The suite is organised into three layers:

1. **Unit tests – `toRoman()`**: 31 tests covering all canonical values, both boundary values (1 and 3999), and all invalid input categories (out-of-range integers, floats, NaN, Infinity, non-numbers).
2. **Unit tests – validation helpers**: 15 tests verifying the `validateSingleQuery` and `validateRangeQuery` functions independently of HTTP.
3. **Integration tests – HTTP endpoints**: 21 tests exercising the full request/response cycle via `supertest`, covering happy path, edge cases, ascending-order guarantee, correct JSON shapes, Content-Type headers, and all error paths (400, 422, 404).

**Total: 67 tests, 0 failures.**

Run the tests:

```bash
npm test                 # run all tests
npm run test:coverage    # run tests with coverage report
```

---

## CI/CD Pipeline

Every push to `main`/`master` and every pull request targeting those branches triggers the pipeline defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Job graph

```
install
├── lint    ─┐
└── verify  ─┴─▶  test  ─▶  build
```

| Job | What it does |
|-----|-------------|
| **Install** | Runs `npm ci` — gates all downstream jobs on a clean install |
| **Lint** | Runs `eslint .` — enforces code style and catches common errors |
| **Verify** | Runs `npm audit --audit-level=high` — fails on any high/critical CVE |
| **Test** | Runs `jest --coverage` — uploads the coverage report as a workflow artifact (kept 7 days) |
| **Build** | Runs `docker build` — proves the image builds and the in-container test suite still passes; uses GitHub Actions layer cache to keep builds fast |

`lint` and `verify` run in parallel after `install`. `test` only starts once both pass. `build` only starts after `test` passes.

### Running the checks locally

```bash
npm run lint          # ESLint
npm audit             # dependency vulnerability check
npm test              # unit + integration tests
npm run test:coverage # tests + coverage report
docker build -t roman-numeral-service .  # full Docker build
```

---

## Package Layout

```
roman-numeral-service/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── app.js                      # Express app factory (middleware, security headers, rate limiting)
├── converter.js                # Roman numeral conversion algorithm (no libraries)
├── logger.js                   # Pino structured logger configuration
├── router.js                   # Route handlers for /romannumeral
├── server.js                   # TCP server entry point + graceful shutdown
├── validation.js               # Input validation helpers
├── roman-numeral.test.js       # Full test suite (unit + integration)
├── eslint.config.js            # ESLint flat config
├── .dockerignore
├── .gitignore
├── Dockerfile
├── package.json
└── README.md
```

---

## Dependency Attribution

| Package | Version | Role | License |
|---------|---------|------|---------|
| [express](https://expressjs.com/) | ^4.18.2 | HTTP server framework | MIT |
| [helmet](https://helmetjs.github.io/) | ^8.1.0 | HTTP security headers (CSP, HSTS, X-Content-Type-Options, etc.) | MIT |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^8.3.2 | Per-IP rate limiting | MIT |
| [pino](https://getpino.io/) | ^8.19.0 | Structured JSON logger | MIT |
| [pino-pretty](https://github.com/pinojs/pino-pretty) | ^11.0.0 | Human-readable log formatter (dev/non-prod) | MIT |
| [jest](https://jestjs.io/) | ^29.7.0 | Test framework *(devDependency)* | MIT |
| [supertest](https://github.com/ladjs/supertest) | ^7.0.0 | HTTP integration testing *(devDependency)* | MIT |
| [eslint](https://eslint.org/) | ^10.2.0 | JavaScript linter *(devDependency)* | MIT |
| [@eslint/js](https://github.com/eslint/eslint/tree/main/packages/js) | ^10.0.1 | ESLint recommended rules *(devDependency)* | MIT |
| [globals](https://github.com/sindresorhus/globals) | ^17.5.0 | Global variable definitions for ESLint *(devDependency)* | MIT |

All production dependencies are MIT-licensed. No dependencies were used for the Roman numeral conversion logic itself.

---

## Docker

### Build and run (Extension 3)

```bash
# Build the image (tests run automatically during build)
docker build -t roman-numeral-service .

# Run the container
docker run -p 8080:8080 roman-numeral-service

# Override log level
docker run -p 8080:8080 -e LOG_LEVEL=debug roman-numeral-service
```

### Design decisions

- **Multi-stage build**: The `builder` stage installs all dependencies and runs the full test suite. The final `production` stage copies only pruned production dependencies and named source files — resulting in a smaller, cleaner image with no test files.
- **Pinned base image**: Both `FROM` lines reference the exact image digest (`sha256:…`) so builds are fully reproducible and immune to silent upstream changes.
- **Non-root user**: The container runs as a dedicated `appuser` (not root) to reduce the attack surface. All copied files are `--chown`ed to that user at copy time.
- **`.dockerignore`**: Excludes `node_modules`, markdown files, and `.git` from the build context to keep builds fast and deterministic.
- **`HEALTHCHECK`**: Docker (and Kubernetes) can poll `GET /romannumeral?query=1` every 30 seconds to determine container health.
- **`NODE_ENV=production`**: Disables pretty-printing and enables production-optimised behaviour in Express and pino.
- **Security headers**: `helmet` sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, Content Security Policy, and removes the `X-Powered-By` header.
- **Rate limiting**: 200 requests per minute per IP; excess requests receive `429 Too Many Requests` with standard `RateLimit-*` headers.
- **Graceful shutdown**: `SIGTERM`/`SIGINT` drain in-flight requests before exiting; a 10-second hard timeout prevents the process from hanging indefinitely.

---

## Roman Numeral Specification

Reference: [Wikipedia – Roman numerals](https://en.wikipedia.org/wiki/Roman_numerals)

The seven basic symbols and their values:

| Symbol | Value |
|--------|-------|
| I      | 1     |
| V      | 5     |
| X      | 10    |
| L      | 50    |
| C      | 100   |
| D      | 500   |
| M      | 1000  |

Subtractive pairs used in this implementation: **IV** (4), **IX** (9), **XL** (40), **XC** (90), **CD** (400), **CM** (900).

The largest standard Roman numeral without non-standard notation is **MMMCMXCIX** (3999).
