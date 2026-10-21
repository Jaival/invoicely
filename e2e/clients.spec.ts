import { expect, randomAddress, signUp, test } from './fixtures'

test('add, find, edit and delete a client', async ({ page }) => {
  await signUp(page)

  await page.getByRole('link', { name: 'Clients' }).click()
  await expect(page.getByText('No clients yet')).toBeVisible()
  await page.getByRole('link', { name: 'Add client' }).click()
  await expect(page).toHaveURL('/clients/new')

  await page.getByLabel('Name').fill('Babbage & Co')
  await page.getByLabel('Email').fill('accounts@babbage.example')
  await page.getByLabel('City').fill('London')
  await page.getByRole('combobox', { name: 'Country' }).click()
  await page.getByRole('option', { name: 'United Kingdom' }).click()
  await page.getByLabel('Notes').fill('Pays on the 1st')
  await page.getByRole('button', { name: 'Add client' }).click()

  await expect(page).toHaveURL('/clients')
  await expect(page.getByText('Client added')).toBeVisible()
  const row = page.getByRole('row', { name: /Babbage & Co/ })
  await expect(row).toContainText('accounts@babbage.example')
  await expect(row).toContainText('London, United Kingdom')

  // Search matches name or email; % is matched literally.
  await page.getByRole('link', { name: 'New client' }).click()
  await page.getByLabel('Name').fill('Lovelace Ltd')
  await page.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByRole('row', { name: /Lovelace Ltd/ })).toBeVisible()
  const search = page.getByRole('searchbox', { name: 'Search clients' })
  await search.fill('babbage.example')
  await search.press('Enter')
  await expect(page).toHaveURL('/clients?q=babbage.example')
  await expect(page.getByRole('row', { name: /Babbage & Co/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Lovelace Ltd/ })).toBeHidden()
  await search.fill('%')
  await search.press('Enter')
  await expect(page.getByText('No clients match “%”.')).toBeVisible()

  await page.goto('/clients')
  await page.getByRole('link', { name: 'Babbage & Co' }).click()
  await expect(page.getByLabel('Notes')).toHaveValue('Pays on the 1st')
  await page.getByLabel('Name').fill('Babbage Engines')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL('/clients')
  await expect(
    page.getByRole('link', { name: 'Babbage Engines' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Babbage Engines' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete client' }).click()
  await expect(page).toHaveURL('/clients')
  await expect(page.getByText('Client deleted')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Babbage Engines' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Lovelace Ltd' })).toBeVisible()
})

test('invalid fields are flagged and keep what was typed', async ({ page }) => {
  await signUp(page)
  await page.goto('/clients/new')

  await page.getByLabel('Email').fill('not-an-email')
  await page.getByRole('button', { name: 'Add client' }).click()

  await expect(page.getByText('Enter the client’s name')).toBeVisible()
  await expect(page.getByText('Enter a valid email')).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('not-an-email')
})

test('clients are private to their business', async ({ page, browser }) => {
  const owner = page
  await signUp(owner, 'Owner')
  await owner.goto('/clients/new')
  await owner.getByLabel('Name').fill('Secret Client')
  await owner.getByRole('button', { name: 'Add client' }).click()
  await owner.getByRole('link', { name: 'Secret Client' }).click()
  await expect(owner).toHaveURL(/\/clients\/[0-9a-f-]{36}$/)
  const clientUrl = owner.url()

  // A second user in a separate browser context, with its own address for
  // the rate limiter (see fixtures.ts).
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomAddress() },
  })
  const other = await context.newPage()
  await signUp(other, 'Other')
  await other.goto('/clients')
  await expect(other.getByText('No clients yet')).toBeVisible()
  const response = await other.goto(clientUrl)
  expect(response?.status()).toBe(404)

  // A malformed id is a 404 too, not a database error.
  expect((await other.goto('/clients/not-a-uuid'))?.status()).toBe(404)
  await context.close()
})
