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
   └── merge ──▶ Vercel (Next.js) ──▶ Neon Postgres (branch per preview)
                     │
                     └── Vercel Cron ──▶ /api/cron/* (later: enqueue pg-boss jobs)
```

## Steps

1. [ ] Create a Neon project with `main` (production) and `dev` branches
2. [ ] Add `DATABASE_URL` and the other secrets to `.env.example` (no real values) and to a typed env module
3. [ ] Import the GitHub repo into Vercel; set the framework preset and Bun as the install command
4. [ ] Add production and preview environment variables in Vercel
5. [ ] Enable the Neon ↔ Vercel integration so each preview deployment gets its own database branch
6. [ ] Write `.github/workflows/ci.yml`:
   - `oven-sh/setup-bun` → `bun install --frozen-lockfile`
   - `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`
   - Playwright job against the build
7. [ ] Run Drizzle migrations in a release step before the new build goes live (not at runtime)
8. [ ] Protect `main`: require CI to pass and use PRs only
9. [ ] Add a custom domain (optional at this stage)
10. [ ] Connect Sentry (Phase 1) and add source map upload to the build

## Done when

- Every PR gets a green CI run and a preview URL with its own database branch
- Merging to `main` deploys production automatically

## Cost notes

Free tiers on Vercel (Hobby) and Neon cover development. Vercel Hobby is non-commercial, so plan for
Pro or a later DevOps stage before charging customers.
