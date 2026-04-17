# Roman Numeral Service

A production-quality HTTP microservice that converts integers to Roman numerals, built for the Adobe AEM Engineering Test (Revision 1.2).

![CI](https://github.com/<your-org>/<your-repo>/actions/workflows/ci.yml/badge.svg)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running with Docker Compose](#running-with-docker-compose)
3. [API Reference](#api-reference)
4. [Engineering Methodology](#engineering-methodology)
5. [Testing Methodology](#testing-methodology)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Package Layout](#package-layout)
8. [Dependency Attribution](#dependency-attribution)
9. [Roman Numeral Specification](#roman-numeral-specification)

---

## Quick Start

### Prerequisites

| Tool | Minimum version | Required for |
|------|----------------|-------------|
| [Node.js](https://nodejs.org/) | 18.0.0 | Local development |
| npm | 9.0.0 | Local development |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x | Docker / Compose |

### Option A — Local development (Node.js)

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd roman-numeral-service

# 2. Install dependencies
npm install

# 3. Start the server (default port 8080)
npm start
```

Override port or log verbosity:

```bash
PORT=3000 LOG_LEVEL=debug npm start
```

### Option B — Docker Compose (recommended)

Starts the service together with Prometheus and Grafana in one command. See [Running with Docker Compose](#running-with-docker-compose) for the full walkthrough.

```bash
git clone <your-repo-url>
cd roman-numeral-service
docker compose up --build
```

### Verify the service is responding

```bash
curl "http://localhost:8080/romannumeral?query=2024"
# → {"input":"2024","output":"MMXXIV"}

curl "http://localhost:8080/romannumeral?min=1&max=5"
# → {"conversions":[{"input":"1","output":"I"},{"input":"2","output":"II"},{"input":"3","output":"III"},{"input":"4","output":"IV"},{"input":"5","output":"V"}]}

curl "http://localhost:8080/health"
# → {"status":"ok","uptime":3.2,"timestamp":"2024-01-01T00:00:00.000Z"}
```

---

## Running with Docker Compose

The included `docker-compose.yml` starts three services together:

```
┌──────────────────────┐   scrapes /metrics    ┌─────────────────┐
│  roman-numeral-svc   │ ◄───────────────────  │   Prometheus    │
│  :8080               │   every 15 s          │   :9090         │
└──────────────────────┘                       └───────┬─────────┘
                                                       │ datasource
                                              ┌────────▼─────────┐
                                              │    Grafana        │
                                              │    :3000          │
                                              └──────────────────┘
```

### Step 1 — Build and start the stack

```bash
docker compose up --build
```

The `--build` flag rebuilds the application image from source (including running the full test suite inside Docker). Omit it on subsequent runs if no code has changed.

To run in detached (background) mode:

```bash
docker compose up --build -d
```

### Step 2 — Wait for services to be healthy

After startup you should see log lines like:

```
app-1         | {"level":30,"msg":"Roman Numeral Service listening","port":8080}
prometheus-1  | ts=... msg="Server is ready to receive web requests."
grafana-1     | logger=http.server t=... msg="HTTP Server Listen"
```

Check that all containers are healthy:

```bash
docker compose ps
```

Expected output:

```
NAME            STATUS
app-1           Up (healthy)
prometheus-1    Up
grafana-1       Up
```

### Step 3 — Try the service

```bash
# Single conversion
curl "http://localhost:8080/romannumeral?query=42"
# → {"input":"42","output":"XLII"}

# Range conversion
curl "http://localhost:8080/romannumeral?min=1&max=3"
# → {"conversions":[{"input":"1","output":"I"},{"input":"2","output":"II"},{"input":"3","output":"III"}]}

# Health probe
curl "http://localhost:8080/health"
# → {"status":"ok","uptime":12.4,"timestamp":"..."}

# Raw Prometheus metrics
curl "http://localhost:8080/metrics"
```

### Step 4 — Explore Prometheus

Open **http://localhost:9090** in your browser.

Go to **Status → Targets** to confirm the service is being scraped successfully (`State: UP`).

Try these queries in the **Graph** tab:

```promql
# Requests per second (1-minute window)
rate(http_requests_total[1m])

# 95th-percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))

# Error rate — 4xx and 5xx responses
rate(http_requests_total{status_code=~"[45].."}[1m])

# Node.js process memory (bytes)
process_resident_memory_bytes

# Event-loop lag
nodejs_eventloop_lag_seconds
```

### Step 5 — Explore Grafana

Open **http://localhost:3000** in your browser.

Login: **admin** / **admin** (you will be prompted to change the password).

A pre-built dashboard is automatically provisioned under **Dashboards → Roman Numeral Service → Roman Numeral Service**. It loads immediately — no manual setup needed.

#### What the dashboard shows

| Panel | What it measures |
|-------|----------------|
| **Total Requests** | Cumulative request count since the service started |
| **Request Rate** | Live requests/sec with a sparkline |
| **Error Rate** | % of 4xx + 5xx responses — green < 1 %, yellow < 5 %, red ≥ 5 % |
| **p95 Latency** | 95th-percentile response time — green < 50 ms, yellow < 200 ms, red ≥ 200 ms |
| **Uptime** | Time since the process started |
| **Memory (RSS)** | Current resident set size |
| **Request Rate by Route** | req/s broken down by `/romannumeral`, `/health`, `/metrics` |
| **Request Rate by Status Code** | req/s per status — 2xx green, 4xx orange, 5xx red |
| **Response Time Percentiles** | p50 / p95 / p99 latency over time |
| **CPU Usage** | Process CPU % over time |
| **Memory** | RSS, heap used, and heap total over time |
| **Event Loop Lag** | Node.js event-loop mean and p99 lag in ms |

### Viewing logs

```bash
# All services
docker compose logs -f

# Application only
docker compose logs -f app

# Last 50 lines from a specific service
docker compose logs --tail=50 prometheus
```

### Stopping the stack

```bash
# Stop containers (data volumes are preserved for the next run)
docker compose down

# Stop containers and delete all stored metrics/dashboard data
docker compose down -v
```

### Rebuilding after code changes

```bash
docker compose up --build
```

Docker layer caching means only changed layers are rebuilt — a code-only change typically completes in under 30 seconds.

---

## API Reference

### Single Conversion

**`GET /romannumeral?query={integer}`**

| Parameter | Type    | Required | Description                       |
|-----------|---------|----------|-----------------------------------|
| `query`   | integer | Yes      | Integer in the range **1 – 3999** |

**Success – 200 OK**
```json
{ "input": "14", "output": "XIV" }
```

**Error – 400 Bad Request** (missing, non-integer, or too long)
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

| Parameter | Type    | Required | Description                                 |
|-----------|---------|----------|---------------------------------------------|
| `min`     | integer | Yes      | Lower bound (inclusive), range **1 – 3999** |
| `max`     | integer | Yes      | Upper bound (inclusive), range **1 – 3999** |

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

### Health Check

**`GET /health`**

Used by Docker `HEALTHCHECK`, Kubernetes liveness/readiness probes, and load balancers.

**200 OK**
```json
{ "status": "ok", "uptime": 42.3, "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### Prometheus Metrics

**`GET /metrics`**

Returns all metrics in [Prometheus exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/) for scraping.

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Response time |
| `process_cpu_seconds_total` | Counter | — | Node.js CPU usage |
| `process_resident_memory_bytes` | Gauge | — | Process RSS memory |
| `nodejs_eventloop_lag_seconds` | Gauge | — | Event-loop lag |
| *(+ other default prom-client metrics)* | | | |

> **Production note**: in a real deployment this endpoint should be on an internal-only port or protected by a network policy so it is not publicly reachable.

---

### HTTP Status Code Summary

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request — missing, non-numeric, or malformed parameter |
| 404 | Not Found — unrecognised route |
| 422 | Unprocessable Entity — valid integer but outside `[1, 3999]` |
| 429 | Too Many Requests — rate limit exceeded (200 req/min per IP) |
| 500 | Internal Server Error — logged server-side, generic message returned |

---

## Engineering Methodology

### Conversion Algorithm

The Roman numeral algorithm is a **greedy descent** over a lookup table ordered from largest value to smallest:

```
1000→M, 900→CM, 500→D, 400→CD, 100→C, 90→XC,
50→L, 40→XL, 10→X, 9→IX, 5→V, 4→IV, 1→I
```

For each entry the algorithm subtracts the value and appends the symbol repeatedly until the remainder is smaller, then moves to the next entry. All six subtractive pairs (IV, IX, XL, XC, CD, CM) are explicit table entries. Implemented from scratch in [`src/converter.js`](src/converter.js) — no third-party library used.

### Separation of Concerns

| File | Responsibility |
|------|---------------|
| `src/converter.js` | Pure Roman numeral conversion logic |
| `src/validation.js` | Input parsing and validation |
| `src/router.js` | Route handlers for `/romannumeral` |
| `src/ops-router.js` | Ops endpoints: `/health` and `/metrics` |
| `src/metrics.js` | Prometheus registry, counters, histograms, request middleware |
| `src/app.js` | Express app — middleware, security headers, rate limiting, error handling |
| `src/server.js` | TCP binding and graceful shutdown |
| `src/logger.js` | Structured JSON logging via pino |

`app.js` is decoupled from `server.js` so tests import the app without binding a real socket.

### Async / Parallel Range Processing

Range queries use `Promise.all()` to dispatch all conversions as microtasks concurrently. `Promise.all` preserves insertion order so results arrive in ascending order without a sort step.

### Logging, Metrics & Monitoring

**Logging** — Structured JSON via **pino**. Every request is logged with `requestId`, method, URL, status code, and response time. `LOG_LEVEL` controls verbosity (`debug` | `info` | `warn` | `error` | `fatal`). In non-production environments pino-pretty renders coloured output.

**Request IDs** — Every request gets an `X-Request-ID` response header (propagated from the caller or generated as a UUID). Included in every log line for cross-service trace correlation.

**Metrics** — **prom-client** records per-request counters and duration histograms alongside default Node.js process metrics, exposed at `GET /metrics` in Prometheus format.

**Health check** — `GET /health` returns JSON liveness status for Docker, Kubernetes, and load-balancer probes.

### Security

- **`helmet`** — sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, CSP; removes `X-Powered-By`
- **Rate limiting** — 200 req/min per IP via `express-rate-limit`; `/health` and `/metrics` are excluded
- **Input length cap** — raw query strings are rejected before parsing if they exceed 20 characters
- **Non-root container** — runs as a dedicated `appuser`; no shell, no package manager in the final image
- **Pinned base image** — both `FROM` lines use an exact digest so builds are reproducible

### Graceful Shutdown

`SIGTERM`/`SIGINT` drain in-flight requests before exiting. A 10-second hard timeout force-exits if connections fail to drain.

---

## Testing Methodology

Tests are written with **Jest** and **supertest**, organised into four layers:

1. **Unit – `toRoman()`** (31 tests): all canonical conversions, boundary values (1, 3999), and all invalid input categories (out-of-range, float, NaN, Infinity, non-number).
2. **Unit – validation helpers** (15 tests): `validateSingleQuery` and `validateRangeQuery` in isolation from HTTP.
3. **Integration – HTTP endpoints** (21 tests): full request/response cycle — happy path, edge cases, JSON shape, Content-Type, all error paths (400, 422, 404).
4. **Ops endpoints** (6 tests): `/health` JSON shape and `/metrics` Prometheus format and metric presence.

**Total: 73 tests, 0 failures.**

```bash
npm test                 # run all tests
npm run test:coverage    # run tests + generate coverage report
```

---

## CI/CD Pipeline

Every push to `main`/`master` and every pull request triggers the pipeline in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Job graph

```
install
├── lint    ─┐
└── verify  ─┴──▶  test  ──▶  build
```

| Job | What it does |
|-----|-------------|
| **Install** | `npm ci` — gates all downstream jobs on a clean dependency install |
| **Lint** | `eslint .` — enforces code style, catches common errors |
| **Verify** | `npm audit --audit-level=high` — fails on any high/critical CVE |
| **Test** | `jest --coverage` — uploads coverage report as a 7-day artifact |
| **Build** | `docker build` — proves the image builds and in-container tests pass; uses GHA layer cache |

`lint` and `verify` run in parallel. `test` waits for both. `build` waits for `test`.

### Running checks locally

```bash
npm run lint               # ESLint
npm audit                  # dependency vulnerability scan
npm test                   # unit + integration tests
npm run test:coverage      # tests + coverage report
docker build -t roman-numeral-service .
```

---

## Package Layout

```
roman-numeral-service/
├── .github/
│   └── workflows/
│       └── ci.yml                          # GitHub Actions CI pipeline
├── observability/
│   ├── prometheus/
│   │   └── prometheus.yml                  # Prometheus scrape config
│   └── grafana/
│       ├── dashboards/
│       │   └── roman-numeral-service.json  # Pre-built dashboard (auto-provisioned)
│       └── provisioning/
│           ├── dashboards/
│           │   └── dashboards.yml          # Tells Grafana where to load dashboard files
│           └── datasources/
│               └── prometheus.yml          # Grafana datasource (auto-provisioned)
├── src/
│   ├── app.js                              # Express app (middleware, security, metrics wiring)
│   ├── converter.js                        # Roman numeral conversion algorithm
│   ├── logger.js                           # Pino structured logger
│   ├── metrics.js                          # Prometheus registry + request middleware
│   ├── ops-router.js                       # /health and /metrics endpoints
│   ├── router.js                           # /romannumeral route handlers
│   ├── server.js                           # TCP server entry point + graceful shutdown
│   └── validation.js                       # Input validation helpers
├── tests/
│   └── roman-numeral.test.js               # Full test suite (unit + integration + ops)
├── .dockerignore
├── .gitignore
├── docker-compose.yml                      # Local observability stack (app + Prometheus + Grafana)
├── Dockerfile
├── eslint.config.js
├── package.json
└── README.md
```

---

## Dependency Attribution

| Package | Version | Role | License |
|---------|---------|------|---------|
| [express](https://expressjs.com/) | ^4.18.2 | HTTP server framework | MIT |
| [helmet](https://helmetjs.github.io/) | ^8.1.0 | HTTP security headers | MIT |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | ^8.3.2 | Per-IP rate limiting | MIT |
| [pino](https://getpino.io/) | ^8.19.0 | Structured JSON logger | MIT |
| [pino-pretty](https://github.com/pinojs/pino-pretty) | ^11.0.0 | Human-readable log formatter (non-prod) | MIT |
| [prom-client](https://github.com/siimon/prom-client) | ^15.1.3 | Prometheus metrics client | Apache-2.0 |
| [jest](https://jestjs.io/) | ^29.7.0 | Test framework *(devDependency)* | MIT |
| [supertest](https://github.com/ladjs/supertest) | ^7.0.0 | HTTP integration testing *(devDependency)* | MIT |
| [eslint](https://eslint.org/) | ^10.2.0 | JavaScript linter *(devDependency)* | MIT |
| [@eslint/js](https://github.com/eslint/eslint) | ^10.0.1 | ESLint recommended rules *(devDependency)* | MIT |
| [globals](https://github.com/sindresorhus/globals) | ^17.5.0 | ESLint global variable definitions *(devDependency)* | MIT |

No dependencies were used for the Roman numeral conversion logic itself.

---

## Roman Numeral Specification

Reference: [Wikipedia – Roman numerals](https://en.wikipedia.org/wiki/Roman_numerals)

| Symbol | Value |
|--------|-------|
| I | 1 |
| V | 5 |
| X | 10 |
| L | 50 |
| C | 100 |
| D | 500 |
| M | 1000 |

Subtractive pairs: **IV** (4), **IX** (9), **XL** (40), **XC** (90), **CD** (400), **CM** (900).

The largest standard Roman numeral is **MMMCMXCIX** (3999).
