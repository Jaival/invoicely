# DevOps Stage 1 — Managed hosting (Vercel + Neon)

**Roadmap phase:** 0 · **Standalone:** yes, needs only the repo and a GitHub account

## Goal

Get Invoicely live on a public URL with continuous integration and preview deployments, while
spending as little time on infrastructure as possible.

## What you'll learn

- CI pipelines with GitHub Actions
- Preview vs production environments
- Environment variables and secrets management
- Running database migrations as part of a release

## Architecture

```
GitHub ── PR ──▶ GitHub Actions (lint, typecheck, test, build, E2E)
   │
   └── merge ──▶ Vercel (Next.js) ──▶ Neon Postgres (production + shared dev branch)
                     │
                     └── Vercel Cron ──▶ /api/cron/* (later: enqueue pg-boss jobs)
```

## Steps

1. [x] Create a Neon project with `production` and `dev` branches
2. [x] Add `DATABASE_URL` and the other secrets to `.env.example` (no real values) and to a typed env module
3. [x] Import the GitHub repo into Vercel; set the framework preset and Bun as the install command
4. [x] Add production and preview environment variables in Vercel
5. [x] Enable the Neon ↔ Vercel integration for production; previews share the `dev` branch
6. [x] Write `.github/workflows/ci.yml`:
   - `oven-sh/setup-bun` → `bun install --frozen-lockfile`
   - `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`
   - Playwright job against the build
7. [x] Run Drizzle migrations in a release step before the new build goes live (not at runtime)
8. [x] Protect `main`: require CI to pass and use PRs only
9. [ ] Add a custom domain (optional at this stage)
10. [ ] Connect Sentry (Phase 1) and add source map upload to the build

### Neon

1. Sign up at [neon.tech](https://neon.tech) (GitHub login is fine) and create a project named
   `invoicely` in AWS `eu-central-1` (Frankfurt), Postgres 18.
2. The project starts with a `main` branch. Rename it to `production` (**Branches → ⋯ → Rename**;
   connection strings don't change) and create a `dev` branch from it (**Branches → New branch**).
   Keep exactly these two: `production` for production, `dev` for local development and every
   preview deployment.
3. Copy the `dev` connection strings (**Connect**, pooled and direct) into `.env.local` as
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

### Vercel

1. Install the [Vercel GitHub app](https://github.com/apps/vercel) on the `invoicely` repo.
2. Link the repo to a Vercel project, either in the dashboard (**Add New → Project → Import**) or
   from the CLI:

   ```bash
   vercel link --yes
   vercel git connect
   ```

   Vercel detects Next.js and `bun.lock` and runs `bun install` on its own. `vercel.json` only pins
   functions to `fra1` (Frankfurt) so they run next to the database; keep the two regions together
   or every query pays a cross-region round trip.

3. Environment variables: none are required yet. `NEXT_PUBLIC_APP_URL` falls back to the deployment
   URL (preview) or the production domain (production), so set it only once a custom domain exists.

### Neon ↔ Vercel integration

Use the **Neon-managed** integration so the database and its billing live in Neon. Later DevOps
stages move the app off Vercel and the database has to outlive it. (The Vercel-managed integration
bills through Vercel instead; the two cannot coexist on one project.)

1. In Vercel: **Integrations → Browse Marketplace → Neon → Link existing Neon account**, and select
   the `invoicely` Neon project and the `invoicely` Vercel project.
2. Point **Production** at the Neon `production` branch.
3. Turn **off** branching for preview deployments, so the integration stops creating a
   `preview/<git-branch>` database per preview.
4. In Vercel, add `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for the **Preview** environment (all
   branches) using the `dev` branch's pooled and direct connection strings.

Previews and local development share `dev`, and each preview build runs pending migrations on it.
If an abandoned PR leaves a migration behind, reset `dev` from its parent
(**Branches → dev → Reset from parent**) and re-run `bun run db:migrate` and `bun run db:seed`.

### Protect `main`

**Settings → Branches → Add rule** for `main`: require a pull request and require the
`Lint, typecheck, unit tests, build` and `E2E (Playwright)` checks to pass.

## Done when

- Every PR gets a green CI run and a preview URL backed by the `dev` database
- Merging to `main` deploys production automatically

## Cost notes

Free tiers on Vercel (Hobby) and Neon cover development. Vercel Hobby is non-commercial, so plan for
Pro or a later DevOps stage before charging customers.
