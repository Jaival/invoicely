import { expect, linkFromEmail, signUp, test, testPassword } from './fixtures'

test('signed-out visitors are sent from the dashboard to sign-in', async ({
  page,
}) => {
  await page.goto('/dashboard')

  await expect(page).toHaveURL('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('sign up, confirm the email, sign out, and sign back in', async ({
  page,
}) => {
  const email = `e2e-${crypto.randomUUID()}@example.com`

  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Ada Lovelace')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  // The emailed link verifies the address and signs the user in.
  await page.goto(await linkFromEmail(email, /confirm your email/i))
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

  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('signing in before confirming sends a new link', async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.com`
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Grace Hopper')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(testPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByText('Confirm your email before signing in'),
  ).toBeVisible()

  // The second email's link works.
  await page.goto(await linkFromEmail(email, /confirm your email/i, 2))
  await expect(page).toHaveURL('/dashboard')
})

test('reset a forgotten password by email', async ({ page }) => {
  const email = await signUp(page)
  const newPassword = 'battery-staple-horse'
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')

  await page.getByRole('link', { name: 'Forgot password?' }).click()
  // Wait for the page, or the sign-in form's Email field gets filled.
  await expect(
    page.getByRole('heading', { name: 'Reset your password' }),
  ).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(
    page.getByRole('heading', { name: 'Check your email' }),
  ).toBeVisible()

  await page.goto(await linkFromEmail(email, /reset your/i))
  await expect(page).toHaveURL(/\/reset-password\?token=/)
  await page.getByLabel('New password').fill(newPassword)
  await page.getByRole('button', { name: 'Reset password' }).click()

  await expect(page).toHaveURL('/sign-in?reset=success')
  await expect(page.getByText('Password updated')).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('an invalid reset link offers a new one', async ({ page }) => {
  await page.goto('/reset-password?error=INVALID_TOKEN')
  await expect(
    page.getByRole('heading', { name: 'This link has expired' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Request a new link' }).click()
  await expect(page).toHaveURL('/forgot-password')
})
