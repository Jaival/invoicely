import { expect, test } from './fixtures'

test('signed-out visitors are sent from the dashboard to sign-in', async ({
  page,
}) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('sign up, sign out, and sign back in with email', async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.com`
  const password = 'correct-horse-battery'

  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Ada Lovelace')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Welcome, Ada Lovelace' }),
  ).toBeVisible()
  // The personal organization is created and active on the first session.
  await expect(page.getByText(`${email} · Ada Lovelace`)).toBeVisible()

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
})
