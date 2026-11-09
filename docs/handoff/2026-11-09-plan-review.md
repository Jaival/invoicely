# Handoff: plan review and Phase 4 restart (2026-11-09)

The roadmap was reviewed after Phase 4 step 1 (manual payments, #43) and Docker (#45). The review
reordered Phase 4 and everything after it ([#46](https://github.com/Jaival/invoicely/pull/46)).
`ROADMAP.md` is the source of truth; this note records why, and what is open.

## Done

- **#43** Manual payments: `payment` table, `invoice.amount_paid`, partially paid status, capped at the
  balance. Migration 0011 is one-way (old code violates the new check).
- **#44** Lower Vercel Fluid compute usage.
- **#45** Multi-stage Docker image and compose (db, migrate, web). Ticked under Phase 6.
- **#46** Roadmap review:
  - Phase 4 is now 7 ordered steps: domain and email, dashboard, Stripe payment model, Connect
    onboarding, Pay now (Checkout + webhook in one PR), payment tests, launch checklist.
  - Stripe Connect: direct charges on accounts with the full Stripe Dashboard. Stripe is responsible for
    negative balances. No platform fee in v1.
  - Overpayment policy: manual payments stay capped; the webhook always records money and flags the
    invoice "Overpaid by X"; no automatic refunds.
  - New order after v1.0: reminders (5), Docker/VPS (6), recurring and estimates (7), freemium billing
    (8), AWS (9), teams/SMS/templates (10), Kubernetes (11). Drag-and-drop editor is in the backlog.
  - Production stays on Vercel + Neon. Each DevOps stage runs as a mirror and becomes production only
    if it is clearly better.
  - Week estimates removed; each phase has a "Done when".

## In progress

- **Phase 4 step 2, Dashboard**, on branch `feat/dashboard` in its own worktree and thread.
  Scope: outstanding, overdue, paid this month per currency (business time zone, partial payments
  count), links to the list tabs, Clean and Brutal styles, tenant-isolation probe. Also fixes the
  flaky "search, filter and sort" E2E test (~36s against a 30s timeout) at the cause.

## Next

1. Merge the dashboard PR.
2. Step 3, payment model for Stripe (expand-only migration): `payment.source`, unique payment intent
   ID, `stripe_event` table, paid check relaxed to `amount_paid >= total`, no manual removal of Stripe
   payments. No Stripe account needed for this step.
3. Steps 4–5 need the user steps below.

## Waiting on the user

- **Buy the domain** (Phase 4 step 1). Until then production has no email verification, no password
  reset, and "Send" emails no one. Then verify it in Resend and set `RESEND_API_KEY` + `EMAIL_FROM` on
  Vercel production and preview (steps in [01-managed](../devops/01-managed.md)). Don't set the key
  in production before the domain is verified: verification becomes required while emails fail.
- **Create a Stripe test account with Connect enabled** before step 4.
- **Secrets**: the user adds them with `vercel env add`; agents can't pass secrets to Vercel.

## Open decisions

- Checkout session expiry: 30 or 60 minutes. Decide in step 5.
- Payment methods in Checkout beyond cards (SEPA, etc.). Delayed methods need
  `checkout.session.async_payment_succeeded`, which is already in the webhook plan.
- Where the "Overpaid by X" notice shows (invoice page only, or also the list). Decide in step 3.
- Stable staging URL for Stripe webhooks on previews (Vercel protection bypass). Decide in step 6.

## Gotchas

- Never `git stash -u`: `next dev` recreates `AGENTS.md` and blocks restoring untracked files.
- Don't commit `AGENTS.md` or `.claude/`.
- New queries live in `src/lib`, scoped by organization, and must be added to the tenant-isolation
  probes and the data-access allowlist, or the schema isolation guard fails.
- Migrations must stay backward compatible: the previous deployment serves while the new one builds.
  #43 was the last one-way migration allowed before launch.
