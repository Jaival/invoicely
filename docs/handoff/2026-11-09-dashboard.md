# Handoff: Phase 4 step 2, Dashboard (2026-11-09)

## Done

- **Dashboard** (`src/app/(app)/dashboard/page.tsx`): Outstanding, Overdue and Paid this month, one
  line per currency, never added across currencies. Each figure links to its invoice list tab
  (Open, Overdue, Paid). A new account (no invoices) sees an empty state with "New invoice".
  - Outstanding and Overdue reuse `outstandingTotals` (the Open tab's totals), so overdue wins over
    partially paid in both places.
  - Paid this month is the new `paidThisMonth` query in `src/lib/invoices/queries.ts`: payments
    (partial ones too) received from the 1st of the business's month to today, by invoice currency.
    The month comes from `monthOf(today)` in `src/lib/dates.ts`; today is `businessToday`, so the
    month turns over at the business's midnight. Probed in `tenant-isolation.db.test.ts`; no new
    data-access module, so the allowlist is unchanged.
  - `MoneyStat` (`src/components/invoices/money-stat.tsx`) is the shared figure box, used by the
    dashboard and the invoice list's Open-tab totals. Brutal fills overdue pink and paid lime; Loud
    tilts them. Amounts use `font-figures` (JetBrains Mono under Brutal).
- **Flaky E2E fix**: "search, filter and sort" spent ~70% of its time entering 2 clients and 3
  invoices through the forms. It now seeds them with `e2e/seed.ts`, which calls the app's own
  queries. Run time alone: ~21–27s → ~12s; 6 parallel copies all pass in ≤18s.
  `playwright.config.ts` loads `.env.local` so the seeding uses the server's database (CI sets
  `DATABASE_URL` directly).
- Local E2E runs use 4 workers (`playwright.config.ts`): the default, half the CPUs (14 here),
  overloaded the dev server and the remote Neon dev branch, and unrelated tests timed out. CI uses
  one worker.

## Next

- Phase 4 step 3, payment model for Stripe (see `ROADMAP.md` and the plan-review handoff).
- `e2e/seed.ts` is there for any test that checks what is shown rather than how it is entered.

## Open decisions

- The dashboard heading is still the placeholder "Welcome, name / Signed in as email". Kept because
  the auth E2E checks it.
