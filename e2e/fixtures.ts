import { test as base, expect, type Page } from '@playwright/test'
import { linkFromEmail } from './outbox'

export { expect, linkFromEmail }

// Better Auth rate-limits sign-in, sign-up and password changes per client
// IP (3 per 10 seconds in production builds). Locally every request shares
// one bucket, so give each test its own address. The app reads it from
// x-forwarded-for, the header Vercel sets in production.
// (The fixture callback is named `provide`, not `use`, so the React hooks lint
// rule doesn't mistake it for React's use().)
export const test = base.extend({
  page: async ({ page }, provide) => {
    const octet = () => Math.floor(Math.random() * 254) + 1
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': `10.${octet()}.${octet()}.${octet()}`,
    })
    await provide(page)
  },
})

export const testPassword = 'correct-horse-battery'

// Signs up a fresh user through the UI, confirms the emailed link, and
// lands on the dashboard.
export async function signUp(page: Page, name = 'Grace Hopper') {
  const email = `e2e-${crypto.randomUUID()}@example.com`
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  await page.goto(await linkFromEmail(email, /confirm your email/i))
  await expect(page).toHaveURL('/dashboard')
  return email
}
