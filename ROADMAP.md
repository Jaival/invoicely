# Invoicely Roadmap

Invoicely is a learning project that aims to become a real product: a polished invoicing SaaS for
freelancers (teams later), built with production-grade practices and a progressive DevOps track.

Time estimates assume **~5–10 hours/week**.

## Decisions

| Area            | Choice                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Next.js (App Router), upgraded in place from 14.0.4                             |
| Package manager | Bun                                                                             |
| UI              | Tailwind CSS v4, shadcn/ui, next-themes                                         |
| Brand           | "Receipt" logo; shadcn theme: Neutral (light) / Slate (dark), Emerald, radius 0 |
| Database        | Postgres + Drizzle ORM                                                          |
| Auth            | Better Auth (organizations plugin when teams arrive)                            |
| Tenancy         | Solo first, schema is organization-ready from day one                           |
| Payments        | Stripe Connect (users' clients pay users directly)                              |
| SaaS billing    | Freemium subscription via Stripe Billing (post-MVP)                             |
| File storage    | Vercel Blob (business logos); S3 from the AWS stage                             |
| Email           | Resend + React Email                                                            |
| PDF             | `@react-pdf/renderer`                                                           |
| Background jobs | pg-boss (queue inside Postgres)                                                 |
| Money           | Per-invoice currency, amounts as integer minor units, per-line tax % + discount |
| Testing         | Vitest (unit) + Playwright (E2E), run in GitHub Actions                         |
| Observability   | Sentry + structured logs → uptime checks → Prometheus/Grafana                   |
| DevOps track    | Managed → Docker/VPS → AWS + Terraform → Kubernetes ([guides](docs/devops/))    |

DevOps stages are interleaved with feature work so the app is live from Phase 0 onward.

---

## Phase 0 — Foundation & first deploy (1–2 weeks) · DevOps stage 1

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

## Phase 1 — Auth, data model & business profile (2 weeks)

- [x] Drizzle setup: schema folder, migrations, seed script
- [x] Core tables: `user`, `organization`, `member` (one auto-created org per user), `business_profile`
- [x] Better Auth with email/password + Google sign-in
- [x] Email verification and password reset (via Resend)
- [x] Protected app shell: sidebar layout, settings pages
- [x] Business profile: name, logo upload, address, tax ID, default currency, invoice prefix
- [x] Sentry for client + server errors
- [x] Structured server logging
- [x] E2E: sign up → verify → complete profile

## Phase 2 — Clients & invoices (3 weeks)

- [x] Clients CRUD (name, email, address, tax ID, notes)
- [x] Invoices: number sequence per org, issue/due dates, currency, notes, terms
- [x] Line items: description, quantity, unit price, tax %, discount
- [x] Money utilities in minor units with full unit-test coverage (rounding, tax, discounts, totals)
- [x] Status lifecycle: draft → sent → paid / overdue / void (partially paid comes with payments in Phase 4)
- [x] Invoice list with filters, search, and sort
- [x] Every query scoped by organization (tenant isolation tests)

## Phase 3 — PDF & email delivery (2 weeks)

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
- [ ] Brutal light: 2–3px black borders, hard 4px shadows, buttons that press in (respects reduced motion),
      contrast-checked colors
- [ ] Palettes: Emerald (emerald actions, mint highlights) and Sunshine (yellow actions, pink highlights),
      both with loud status colors (overdue pink, sent blue, paid lime, draft grey)
- [x] Fonts, loaded only for Brutal: Space Grotesk headings, Inter body, JetBrains Mono for amounts,
      numbers and dates
- [ ] Core components: button, card, input, badge, table, tabs, menu, dialog; then sidebar, forms, empty states
- [ ] Business setting "Public invoice style: Clean / Match my style" for the public page and the PDF
      (embedded fonts, no shadows); emails stay clean
- [ ] Brutal dark; until then Brutal + dark falls back to Brutal light

Not now: the "Loud" variant (rotated stickers and badges, patterned backgrounds) stays a mockup.

## Phase 4 — Payments & tracking (2–3 weeks) → **MVP v1.0**

- [ ] Stripe Connect onboarding (Express accounts) from settings
- [ ] "Pay now" on the public invoice → Stripe Checkout on the user's connected account
- [ ] Webhook handler (signature verification, idempotency) → record payment, update status
- [ ] Manual payment recording (bank transfer, cash)
- [ ] Partially paid status from recorded payments
- [ ] Dashboard: outstanding, overdue, paid this month, per currency
- [ ] E2E: create invoice → send → pay with Stripe test card → status `paid`
- [ ] Launch checklist: privacy policy, terms, custom domain, backups verified

**MVP v1.0 is done when** a freelancer can sign up, invoice a client, and get paid online.

## Phase 5 — Docker + VPS + CI/CD (2–3 weeks) · DevOps stage 2

See [02-docker-vps](docs/devops/02-docker-vps.md).

- [ ] Multi-stage Dockerfile (Next.js standalone output) + `docker-compose` for local dev
- [ ] Separate worker process for pg-boss jobs
- [ ] VPS provisioning, reverse proxy with automatic TLS
- [ ] GitHub Actions: build image → push to registry → deploy
- [ ] Automated Postgres backups with a tested restore
- [ ] Health check endpoint and uptime monitoring

## Phase 6 — Payment reminders (1–2 weeks)

- [ ] pg-boss setup: scheduled job that scans for upcoming and overdue invoices
- [ ] Reminder rules per org (e.g. 3 days before, on due date, 7 days after)
- [ ] Reminder email template + unsubscribe-safe footer
- [ ] Reminder history on the invoice timeline

## Phase 7 — Recurring invoices & estimates (2–3 weeks)

- [ ] Recurring schedules (weekly/monthly/yearly) that generate and optionally auto-send invoices
- [ ] Estimates/quotes with accept/decline on a public link
- [ ] Convert an accepted estimate into an invoice

## Phase 8 — AWS + Terraform (3–4 weeks) · DevOps stage 3

See [03-aws-terraform](docs/devops/03-aws-terraform.md).

- [ ] Terraform for networking, database, container service, secrets, DNS
- [ ] Staging + production environments
- [ ] CI runs `terraform plan` on PRs and `apply` on merge

## Phase 9 — Custom templates & drag-and-drop editor (3–4 weeks)

- [ ] Template gallery (2–3 layouts) + brand color and font settings
- [ ] Drag-and-drop editor for invoice sections (header, items, totals, notes, footer)
- [ ] Shared template model rendered by both the web view and the PDF renderer

## Phase 10 — Teams, SMS & freemium billing (3–4 weeks)

- [ ] Better Auth organizations: invites, roles (owner/admin/member), org switcher
- [ ] Send invoice links by SMS (Twilio)
- [ ] Freemium plans via Stripe Billing: limits on the free tier, customer portal, plan gating

## Phase 11 — Kubernetes & metrics (3–4 weeks) · DevOps stage 4

See [04-kubernetes](docs/devops/04-kubernetes.md).

- [ ] Helm chart for web + worker
- [ ] GitOps deploys with Argo CD
- [ ] Prometheus + Grafana dashboards and alerts

---

## Backlog / ideas

- Expenses and profit view
- Client portal (all invoices for a client)
- CSV / accounting exports
- i18n and localized number/date formats
- Full tax engine (GST/VAT rules, Stripe Tax)
