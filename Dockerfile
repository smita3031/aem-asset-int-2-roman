# ============================================================
# Stage 1: builder
# Install ALL dependencies (including devDependencies) so we
# can run tests and prune afterwards.
# ============================================================
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer caching —
# npm install only re-runs if package*.json changes.
COPY package*.json ./

RUN npm ci

# Copy source after installing dependencies
COPY . .

# Run the full test suite during the build so the image is
# never published with failing tests.
RUN npm test

# Prune dev-only packages before copying to the final stage.
RUN npm prune --production

# ============================================================
# Stage 2: production image
# Small, hardened runtime layer — no dev tools, no test files.
# ============================================================
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS production

# Run as a non-root user for security best practice.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy pruned node_modules and application source from builder.
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/src          ./src

# Set NODE_ENV so pino emits machine-parseable JSON logs.
ENV NODE_ENV=production
ENV PORT=8080
ENV LOG_LEVEL=info

USER appuser

EXPOSE 8080

# Health check — Docker / Kubernetes can use this to decide
# whether the container is ready to receive traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "src/server.js"]
