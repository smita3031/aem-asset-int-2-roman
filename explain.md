# AI Usage on This Project

## The Short Version

I used AI as an agentic pair programmer throughout this project — but with one deliberate boundary. The core integer-to-Roman-numeral conversion logic was written by me, by hand. Everything around it (scaffolding, DevOps, tests, security, CI/CD, observability) was built iteratively with AI assistance.

---

## Tool & Setup

**Tool:** [Claude Code](https://claude.ai/code) — Anthropic's CLI-based coding agent  
**Model:** Claude Sonnet 4.6  
**Mode:** Agentic — Claude had access to read/write files, run shell commands, execute tests, and inspect output directly in the project directory. This is different from a chat interface; it acts more like a capable developer sitting at the same terminal.

---

## The Core Logic Boundary

The project brief was explicit: *do not use existing code or libraries for the number-to-Roman-numeral conversion itself — we want to see your development methodology in action.*

I honoured that literally. I asked Claude to scaffold the project with `converter.js` containing only the function signature and a comment marking where the implementation should go. It produced a clean shell:

```js
function toRoman(num) {
  // implementation goes here
}
```

I then wrote the greedy descent algorithm myself — the lookup table, the while loop, the input guards. That part of the codebase is entirely my own work. Claude never touched it.

For everything else, using AI assistance was fair game and made sense to do efficiently.

---

## Workflow & Iteration

I used a conversational, one-layer-at-a-time approach. Each prompt addressed a specific concern, building on the working state left by the previous one. The rough sequence:

1. **Project scaffold** — Asked for a Node.js/Express service structure with separate `app.js`, `server.js`, `router.js`, `validation.js`, and `logger.js`. Deliberately left `converter.js` as a stub for me to fill in.

2. **Fix real errors as they appeared** — After writing the conversion logic and running `npm start`, paths in `package.json` were pointing to a non-existent `src/` directory. I pasted the error and Claude fixed the config. Same for Docker — pasted the build failure, got a targeted fix.

3. **Security hardening** — Asked Claude to audit the service against security best practices. It identified and added `helmet` (HTTP security headers), `express-rate-limit`, input length guards, request ID propagation, and a graceful shutdown timeout — plus hardened the Dockerfile with a non-root user, pinned base image digest, and `--chown` on all file copies.

4. **Test suite** — Asked Claude to write a comprehensive Jest + supertest suite. It produced unit tests for the converter and validation helpers, and integration tests for every HTTP path including error cases. I reviewed each test to make sure it was actually asserting the right things.

5. **CI/CD pipeline** — Described the desired job graph (install → lint + audit in parallel → test → docker build) and asked Claude to produce the GitHub Actions workflow. It also set up ESLint from scratch since the project had none.

6. **Observability (Extension 3)** — Asked for metrics, health checks, and a local monitoring stack. Claude added `prom-client` with a Prometheus scrape endpoint, a `/health` liveness route, and a `docker-compose.yml` wiring up Prometheus and Grafana — including a fully provisioned Grafana dashboard with 15 panels ready to use out of the box.

7. **Project structure cleanup** — The source files had accumulated in the root. One prompt to reorganize them into `src/` and `tests/` — Claude moved files, updated all internal references, fixed the Dockerfile, and kept tests green.

8. **Documentation** — README updates happened incrementally after each step. Final pass to ensure the docker-compose walkthrough was complete and accurate.

---

## What This Approach Felt Like

The honest version: it felt like working with a very fast junior developer who doesn't forget things, follows instructions precisely, and catches their own mistakes when tests fail. The steering — deciding *what* to build, *why*, and *where to draw lines* — remained mine throughout. The execution of well-understood patterns (Docker multi-stage builds, Prometheus instrumentation, GitHub Actions job graphs) was delegated.

The one area I stayed hands-on beyond the conversion logic was reviewing test assertions. AI-generated tests can pass while testing the wrong thing. I read through them.

---

## Summary

| Aspect | Who wrote it |
|--------|-------------|
| Roman numeral conversion algorithm | Me |
| Express app structure & routing | AI-assisted scaffold, reviewed by me |
| Input validation logic | AI-generated, reviewed by me |
| Test suite | AI-generated, reviewed by me |
| Docker / docker-compose | AI-generated |
| GitHub Actions CI pipeline | AI-generated |
| Security hardening | AI-identified and implemented |
| Prometheus metrics & Grafana dashboard | AI-generated |
| Project structure & README | AI-assisted |
