import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'
import { outboxDir } from './e2e/outbox'

// Tests seed data through the app's queries (e2e/seed.ts), so they need the
// same database as the server. CI sets the variables directly instead.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const PORT = 3000
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Locally, half the CPUs (14 on a 28-thread machine) overload one dev
  // server and the remote Neon dev branch, and unrelated tests time out.
  workers: isCI ? 1 : 4,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI tests the production build; locally reuse a running dev server.
    command: isCI ? 'bun run start' : 'bun run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // Capture emails as files so tests can follow verification and reset
    // links. A dev server you started yourself needs this set too.
    env: { EMAIL_OUTBOX_DIR: outboxDir },
  },
})
