# Invoicely

> NOTE: This is a project for my learning. I will be adding the features while learning so they can be implemented in a dumb way.

- Save time and get paid faster with the easiest-to-use SaaS invoicing application on the market.
- Create professional invoices in minutes with our customizable templates and drag-and-drop interface. No accounting or design experience required.
- Send invoices instantly via email, text, or print. Track payments and set up reminders to ensure you never miss a beat.

### Features:

- Easy-to-use interface
- Customizable invoice templates
- Drag-and-drop functionality
- Instant invoicing via email, text, or print
- Payment tracking and reminders

### Benefits:

- Save time and get paid faster
- Create professional invoices in minutes
- No accounting or design experience required
- Track your finances and improve cash flow

### Roadmap

See [ROADMAP.md](ROADMAP.md) for the phased plan and [docs/devops/](docs/devops/) for the DevOps guides.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · shadcn/ui · Bun · Vitest · Playwright

## Getting started

Requires [Bun](https://bun.sh) and Node.js 20.9+.

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | What it does                       |
| ------------------- | ---------------------------------- |
| `bun run dev`       | Start the dev server               |
| `bun run build`     | Production build                   |
| `bun run start`     | Serve the production build         |
| `bun run lint`      | ESLint                             |
| `bun run typecheck` | TypeScript type check              |
| `bun run format`    | Format with Prettier               |
| `bun run test`      | Unit tests (Vitest)                |
| `bun run test:e2e`  | End-to-end tests (Playwright)      |
| `bun run commit`    | Conventional commit via Commitizen |

Run `bunx playwright install chromium` once before the first E2E run.

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint. CI runs formatting, lint, typecheck, unit tests, build, and E2E on every pull request.
