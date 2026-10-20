import { expect, signUp, test, testPassword } from './fixtures'

test('signed-out visitors are sent from settings to sign-in', async ({
  page,
}) => {
  await page.goto('/settings/profile')
  await expect(page).toHaveURL('/sign-in')
})

test('the sidebar links to settings, which opens on the profile', async ({
  page,
}) => {
  await signUp(page)
  const sidebar = page.locator('[data-sidebar="sidebar"]')

  await sidebar.getByRole('link', { name: 'Settings' }).click()
  await expect(page).toHaveURL('/settings/profile')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Name')).toHaveValue('Grace Hopper')
})

test('rename yourself and see it in the sidebar', async ({ page }) => {
  await signUp(page)
  await page.goto('/settings/profile')

  await page.getByLabel('Name').fill('Rear Admiral Hopper')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Profile saved')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Account menu' }),
  ).toContainText('Rear Admiral Hopper')
})

test('change password, then sign in with the new one', async ({ page }) => {
  const email = await signUp(page)
  const newPassword = 'battery-staple-horse'
  await page.goto('/settings/profile')

  await page.getByLabel('Current password').fill('not-my-password')
  await page.getByLabel('New password').fill(newPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Current password').fill(testPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password changed')).toBeVisible()

  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(newPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('pick a theme on the appearance page', async ({ page }) => {
  await signUp(page)
  await page.goto('/settings/appearance')

  await page.getByRole('radio', { name: 'Light' }).click()
  await expect(page.locator('html')).toHaveClass(/light/)
  await page.getByRole('radio', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
