# syntax=docker/dockerfile:1

# Build stages use Debian (glibc) so native modules such as sharp match the
# runtime image. Bun installs; Node runs the Next.js build and the server.
FROM node:24-slim AS base
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# deps: install all dependencies from the lockfile.
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# migrate: deps plus what drizzle-kit needs. Used by the compose `migrate`
# service; never shipped.
FROM deps AS migrate
COPY tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db ./src/db
CMD ["bun", "run", "db:migrate"]

# build: compile the app. SKIP_ENV_VALIDATION skips the env check, but the
# build still runs the auth module, which refuses to load without a secret. The
# inline value is a dummy for this one command only: it is not an ENV, so it is
# not stored in the image config. The real secret comes in at run time.
# NEXT_PUBLIC_APP_URL is public and inlined into the client bundle at build
# time, so override it with --build-arg for any URL other than localhost.
FROM deps AS build
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
COPY . .
RUN SKIP_ENV_VALIDATION=1     BETTER_AUTH_SECRET=build-only-dummy-secret-not-used-at-runtime     bun run build

# runtime: only the standalone server, and static assets.
FROM node:24-slim AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"]
CMD ["node", "server.js"]
