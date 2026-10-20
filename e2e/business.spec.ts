import { expect, signUp, test } from './fixtures'

test('set up the business profile from the dashboard', async ({ page }) => {
  await signUp(page, 'Ada Lovelace')

  await page.getByRole('link', { name: 'Set up profile' }).click()
  await expect(page).toHaveURL('/settings/business')
  // Starts from the personal organization's name.
  await expect(page.getByLabel('Business name')).toHaveValue('Ada Lovelace')

  await page.getByLabel('Business name').fill('Lovelace Analytics')
  await page.getByLabel('Billing email').fill('billing@lovelace.example')
  await page.getByLabel('Address line 1').fill('12 Engine Row')
  await page.getByLabel('City').fill('London')
  await page.getByLabel('Postal code').fill('N1 9GU')
  await page.getByRole('combobox', { name: 'Country' }).click()
  await page.getByRole('option', { name: 'United Kingdom' }).click()
  await page.getByRole('combobox', { name: 'Default currency' }).click()
  await page.getByRole('option', { name: 'GBP · British Pound' }).click()
  await page.getByLabel('Invoice number prefix').fill('la')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Business profile saved')).toBeVisible()

  // Saved values come back after a reload, and the business name is now the
  // organization's name in the sidebar.
  await page.reload()
  await expect(page.getByLabel('Business name')).toHaveValue(
    'Lovelace Analytics',
  )
  await expect(page.getByLabel('Invoice number prefix')).toHaveValue('LA')
  await expect(
    page.getByRole('combobox', { name: 'Default currency' }),
  ).toContainText('GBP')
  await expect(
    page.locator('[data-sidebar="header"]').getByText('Lovelace Analytics'),
  ).toBeVisible()

  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Set up profile' })).toBeHidden()
})

test('invalid fields are flagged and keep what was typed', async ({ page }) => {
  await signUp(page)
  await page.goto('/settings/business')

  await page.getByLabel('Billing email').fill('not-an-email')
  await page.getByLabel('Invoice number prefix').fill('INV 2026!')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Enter a valid email')).toBeVisible()
  await expect(
    page.getByText('Use 1–10 letters, numbers or hyphens'),
  ).toBeVisible()
  await expect(page.getByLabel('Billing email')).toHaveValue('not-an-email')
})

// A 1×1 transparent PNG.
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

test('upload and remove a logo', async ({ page }) => {
  await signUp(page)
  await page.goto('/settings/business')
  const logoInput = page.getByLabel('Logo')
  // Needs a Blob token, so it only runs where uploads are set up.
  test.skip(await logoInput.isDisabled(), 'Logo upload is not configured')

  await logoInput.setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: tinyPng,
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Business profile saved')).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Business logo')).toHaveAttribute(
    'src',
    /\.public\.blob\.vercel-storage\.com\/logos\//,
  )

  // Removing it also deletes the stored file.
  await page.getByRole('button', { name: 'Remove logo' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Business profile saved').last()).toBeVisible()
  await page.reload()
  await expect(page.getByAltText('Business logo')).toBeHidden()
})
