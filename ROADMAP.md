# Invoicely Roadmap

Invoicely is a learning project that aims to become a real product: a polished invoicing SaaS for
freelancers (teams later), built with production-grade practices and a progressive DevOps track.

Phases have no time estimates: the first ones took days, not weeks. Each phase ends with a "Done when".

## Decisions

| Area            | Choice                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js (App Router), upgraded in place from 14.0.4                                                           |
| Package manager | Bun                                                                                                           |
| UI              | Tailwind CSS v4, shadcn/ui, next-themes                                                                       |
| Brand           | "Receipt" logo; shadcn theme: Neutral (light) / Slate (dark), Emerald, radius 0                               |
| Database        | Postgres + Drizzle ORM                                                                                        |
| Auth            | Better Auth (organizations plugin when teams arrive)                                                          |
| Tenancy         | Solo first, schema is organization-ready from day one                                                         |
| Payments        | Stripe Connect, direct charges on accounts with the full Stripe Dashboard (users' clients pay users directly) |
| SaaS billing    | Freemium subscription via Stripe Billing (post-MVP)                                                           |
| File storage    | Vercel Blob (business logos); S3 from the AWS stage                                                           |
| Email           | Resend + React Email                                                                                          |
| PDF             | `@react-pdf/renderer`                                                                                         |
| Background jobs | Vercel Cron first; pg-boss (queue inside Postgres) once the worker exists                                     |
| Money           | Per-invoice currency, amounts as integer minor units, per-line tax % + discount                               |
| Testing         | Vitest (unit) + Playwright (E2E), run in GitHub Actions                                                       |
| Observability   | Sentry + structured logs → uptime checks → Prometheus/Grafana                                                 |
| Hosting         | Vercel + Neon in production; each DevOps stage runs as a mirror until it is clearly better                    |
| DevOps track    | Managed → Docker/VPS → AWS + Terraform → Kubernetes ([guides](docs/devops/))                                  |

DevOps stages are interleaved with feature work so the app is live from Phase 0 onward.

---

## Phase 0 — Foundation & first deploy · DevOps stage 1

- [x] Switch to Bun: commit `bun.lock`, delete `package-lock.json`, update README commands
- [x] Replace Windows-only `clean`/`rebuild` scripts with cross-platform ones
- [x] Upgrade to Next.js 16, React 19, TypeScript 6 (migrated by hand; too little code for codemods)
- [x] Migrate Tailwind 3 → v4 and re-sync shadcn/ui components
- [x] Migrate ESLint to flat config; keep Prettier + Tailwind plugin
- [x] Upgrade husky + commitlint + commitizen
- [x] Replace the create-next-app page and metadata with an Invoicely landing placeholder
- [x] Set up Vitest and Playwright with one smoke test each
- [x] GitHub Actions CI: install → lint → typecheck → unit tests → build → E2E
- [x] Add `.env.example` and typed env validation
- [x] Deploy to Vercel with a Neon Postgres database (see [01-managed](docs/devops/01-managed.md))

**Done when:** a PR runs green CI and merging to `main` deploys a live URL.

## Phase 1 — Auth, data model & business profile

- [x] Drizzle setup: schema folder, migrations, seed script
- [x] Core tables: `user`, `organization`, `member` (one auto-created org per user), `business_profile`
- [x] Better Auth with email/password + Google sign-in
- [x] Email verification and password reset (via Resend)
- [x] Protected app shell: sidebar layout, settings pages
- [x] Business profile: name, logo upload, address, tax ID, default currency, invoice prefix
- [x] Sentry for client + server errors
- [x] Structured server logging
- [x] E2E: sign up → verify → complete profile

## Phase 2 — Clients & invoices

- [x] Clients CRUD (name, email, address, tax ID, notes)
- [x] Invoices: number sequence per org, issue/due dates, currency, notes, terms
- [x] Line items: description, quantity, unit price, tax %, discount
- [x] Money utilities in minor units with full unit-test coverage (rounding, tax, discounts, totals)
- [x] Status lifecycle: draft → sent → paid / overdue / void (partially paid comes with payments in Phase 4)
- [x] Invoice list with filters, search, and sort
- [x] Every query scoped by organization (tenant isolation tests)

## Phase 3 — PDF & email delivery

- [x] Default invoice template with `@react-pdf/renderer`
- [x] PDF download route
- [x] Public, unguessable invoice view link for clients
- [x] React Email template: "You have a new invoice" with link + PDF attachment
- [x] Send action marks invoice `sent` and records an activity log entry
- [x] Print-friendly public view

## Invoice list polish (after Phase 3)

The list becomes a to-do list first ("who owes me, who's late"), with the All tab as the ledger.

- [x] Open tab by default (sent + overdue + drafts): overdue first, then soonest due, drafts last
- [x] Tabs trimmed to Open · Overdue · Drafts · Paid · All (`?status=void` still works)
- [x] Relative due labels ("12 days overdue", "Due in 5 days", "Paid Oct 3"); Issued column on All only
- [x] Outstanding and overdue totals per currency on the Open tab
- [x] Row "⋯" menu by status: edit, delete, copy link, mark paid, download PDF, duplicate
- [x] Duplicate an invoice into a new draft with fresh dates
- [x] Two-line cards instead of the table on phones
- [x] Numbered pages of 50, kept in the URL with search, filter and sort

Not now: bulk selection, date and client filters (a period picker comes with CSV export).

## Neo Brutalism style (after the invoice list polish)

A selectable style next to the current clean look, built so it could become the default later.

- [x] Style (Clean / Brutal) and palette (Emerald / Sunshine) saved on the account and applied server-side,
      no flash; light/dark mode stays separate, in the browser
- [x] Brutal light: 2–3px black borders, hard 4px shadows, buttons that press in (respects reduced motion),
      contrast-checked colors
- [x] Palettes: Emerald (emerald actions, mint highlights) and Sunshine (yellow actions, pink highlights),
      both with loud status colors (overdue pink, sent blue, paid lime, draft grey)
- [x] Fonts, loaded only for Brutal: Space Grotesk headings, Inter body, JetBrains Mono for amounts,
      numbers and dates
- [x] Core components: button, card, input, badge, table, tabs, menu, dialog; then sidebar, forms, empty states
- [x] Business setting "Public invoice style: Clean / Match my style" for the public page and the PDF
      (embedded fonts, no shadows); emails stay clean
- [x] Brutal dark
- [x] Strength: Full, or Loud (dotted paper, big tilted titles, tilted badges, a "late" sticker), screens only

## Phase 4 — Payments & tracking → **MVP v1.0**

Until v1.0, new style and polish ideas go to the backlog. Build the steps in this order.

1. **Domain and email** (user steps, blocking): without email, production has no email verification,
   no password reset, and "Send" reaches no one.
   - [ ] Buy the domain and point it at Vercel
   - [ ] Verify the domain in Resend; set `RESEND_API_KEY` and `EMAIL_FROM` on Vercel (production + preview)
   - [ ] Check sign-up verification, password reset and the invoice email end to end in production
2. **Dashboard** (no blockers, build it while the Stripe account is set up)
   - [x] Outstanding, overdue, paid this month, per currency
   - [x] Fix the flaky "search, filter and sort" E2E test (~36s against a 30s timeout)
3. **Payment model for Stripe** (expand-only migration)
   - [ ] `payment.source` (`manual` / `stripe`) and a unique Stripe payment intent ID
   - [ ] `stripe_event` table: each webhook event is handled once
   - [ ] Paid invoices allow `amount_paid >= total` (see the overpayment policy below)
   - [ ] Payments from Stripe can't be removed by hand; refunds come from Stripe
4. **Stripe Connect onboarding** (user step first: a Stripe test account with Connect enabled)
   - [ ] Connected accounts with the full Stripe Dashboard; Stripe is responsible for losses and its fees
   - [ ] Onboarding from settings; `account.updated` keeps the account status current
5. **Pay now** (one PR: Checkout and the webhook ship together)
   - [ ] "Pay now" on the public invoice → Stripe Checkout as a direct charge on the user's account,
         for the balance at that moment, expiring in 30–60 minutes; hidden once the balance is 0
   - [ ] Open sessions expire when a payment is recorded by hand, or the invoice is edited or voided
   - [ ] Webhook with signature verification: `checkout.session.completed`,
         `checkout.session.async_payment_succeeded` / `_failed`, `charge.refunded`, `charge.dispute.*`
   - [ ] Only the webhook writes payments; the success page only reads
   - [ ] Sentry alert when webhook handling fails
6. **Payment tests**
   - [ ] Webhook handler tests with signed fixture events in the DB suite
   - [ ] A script that runs the Stripe CLI listener against the local app
   - [ ] One manual run with a test card on a stable staging URL (Vercel protection bypass for Stripe)
7. **Launch checklist**
   - [ ] Privacy policy and terms
   - [ ] Account deletion and data export
   - [ ] Better Auth rate limiting on a shared store (in-memory limits are per instance on serverless)
   - [ ] Neon restore window checked on the current plan, and one restore done into a new branch
   - [ ] Security headers
   - [ ] Stripe live mode activated
   - [ ] README lists only features that exist

**MVP v1.0 is done when** a freelancer can sign up, invoice a client, and get paid online.

### Stripe Connect setup

Invoicely is software; the freelancer is the merchant. Charges are direct charges on the user's
connected account, so the client's statement shows the freelancer, and refunds, disputes and payouts
happen in the user's own Stripe Dashboard. Stripe, not Invoicely, is responsible for negative balances.
Invoicely only mirrors refunds and disputes onto the invoice. No platform fee in v1; revenue comes from
the freemium plan.

### Overpayment policy

Manual payments stay capped at the balance. Online payments can't be capped: the money has already moved.

- Make it rare: sessions are for the current balance, expire quickly, and are expired when the balance changes.
- If it happens anyway, the webhook always records the payment. The invoice is paid and shows
  "Overpaid by €X. Refund the difference in Stripe or remove the duplicate payment."
- No automatic refunds: often the manual payment is the mistake, and the money is in the user's account.

## Phase 5 — Payment reminders

"Get paid faster" is the product's promise, so reminders come right after v1.0.

- [ ] Daily Vercel Cron job that finds upcoming and overdue invoices (moves to pg-boss with the worker)
- [ ] A sent-reminders table, so a reminder is never sent twice
- [ ] Reminder rules per org (e.g. 3 days before, on due date, 7 days after)
- [ ] Reminder email template + unsubscribe-safe footer
- [ ] Reminder history on the invoice timeline

**Done when** an overdue invoice sends its reminders on schedule, once each, and they show on the timeline.

## Phase 6 — Docker + VPS + CI/CD · DevOps stage 2

See [02-docker-vps](docs/devops/02-docker-vps.md). Production stays on Vercel + Neon; the VPS runs as a
staging mirror. Move production only if the VPS is clearly better.

- [x] Multi-stage Dockerfile (Next.js standalone output) + `docker-compose` for local dev
- [ ] Separate worker process for pg-boss jobs; reminders move from Vercel Cron to pg-boss
- [ ] VPS provisioning, reverse proxy with automatic TLS
- [ ] GitHub Actions: build image → push to registry → deploy
- [ ] Automated Postgres backups with a tested restore
- [ ] Health check endpoint and uptime monitoring

**Done when** a merge to `main` deploys to the VPS with no manual steps, and a backup has been restored.

## Phase 7 — Recurring invoices & estimates

- [ ] Recurring schedules (weekly/monthly/yearly) that generate and optionally auto-send invoices
- [ ] Estimates/quotes with accept/decline on a public link
- [ ] Convert an accepted estimate into an invoice

**Done when** a monthly retainer invoices itself, and an accepted estimate becomes an invoice in one click.

## Phase 8 — Freemium billing

- [ ] Freemium plans via Stripe Billing: limits on the free tier, customer portal, plan gating
- [ ] EU VAT on subscriptions: Stripe Tax, or a merchant-of-record service

**Done when** a user can upgrade, downgrade and cancel without help, with VAT charged correctly.

## Phase 9 — AWS + Terraform · DevOps stage 3

See [03-aws-terraform](docs/devops/03-aws-terraform.md). Runs as a mirror, like stage 2.

- [ ] Terraform for networking, database, container service, secrets, DNS
- [ ] Staging + production environments
- [ ] CI runs `terraform plan` on PRs and `apply` on merge

**Done when** `terraform apply` builds the whole environment from nothing.

## Phase 10 — Teams, SMS & templates

- [ ] Better Auth organizations: invites, roles (owner/admin/member), org switcher
- [ ] Send invoice links by SMS (Twilio)
- [ ] Template gallery (2–3 layouts) + brand color and font settings, shared by the web view and the PDF

**Done when** an owner can invite a member who invoices under the same business.

## Phase 11 — Kubernetes & metrics · DevOps stage 4

See [04-kubernetes](docs/devops/04-kubernetes.md).

- [ ] Helm chart for web + worker
- [ ] GitOps deploys with Argo CD
- [ ] Prometheus + Grafana dashboards and alerts

**Done when** a merge deploys through Argo CD and an alert fires on a forced failure.

---

## Backlog / ideas

- Drag-and-drop template editor (the template gallery comes first, in Phase 10)
- Expenses and profit view
- Client portal (all invoices for a client)
- CSV / accounting exports
- i18n and localized number/date formats
- Full tax engine (GST/VAT rules, Stripe Tax)
