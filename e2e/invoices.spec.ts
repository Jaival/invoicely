import { expect, signUp, test } from './fixtures'
import type { Page } from '@playwright/test'

async function addClient(page: Page, name: string) {
  await page.goto('/clients/new')
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Add client' }).click()
  await expect(page).toHaveURL('/clients')
}

const line = (page: Page, n: number) =>
  page.getByRole('group', { name: `Line ${n}` })

async function fillLine(
  page: Page,
  n: number,
  values: {
    description: string
    quantity: string
    unitPrice: string
    taxRate?: string
    discountRate?: string
  },
) {
  const group = line(page, n)
  await group.getByLabel('Description').fill(values.description)
  await group.getByLabel('Quantity').fill(values.quantity)
  await group.getByLabel('Unit price').fill(values.unitPrice)
  if (values.taxRate !== undefined) {
    await group.getByLabel('Tax %').fill(values.taxRate)
  }
  if (values.discountRate !== undefined) {
    await group.getByLabel('Discount %').fill(values.discountRate)
  }
}

test('create, edit and delete a draft invoice', async ({ page }) => {
  await signUp(page)

  await page.getByRole('link', { name: 'Invoices' }).click()
  await expect(page.getByText('No invoices yet')).toBeVisible()
  await page.getByRole('link', { name: 'New invoice' }).click()
  await expect(page.getByText('Add a client first')).toBeVisible()

  await addClient(page, 'Babbage & Co')
  await page.goto('/invoices/new')
  // The only client is picked already; the currency defaults to USD.
  await expect(page.getByRole('combobox', { name: 'Client' })).toHaveText(
    'Babbage & Co',
  )
  await expect(page.getByRole('combobox', { name: 'Currency' })).toContainText(
    'USD',
  )

  await fillLine(page, 1, {
    description: 'Design',
    quantity: '2',
    unitPrice: '100',
    taxRate: '19',
    discountRate: '10',
  })
  await expect(line(page, 1).locator('output')).toHaveText('$180.00')

  // A new line starts with the previous line's tax rate.
  await page.getByRole('button', { name: 'Add line' }).click()
  await expect(line(page, 2).getByLabel('Tax %')).toHaveValue('19')
  await fillLine(page, 2, {
    description: 'Hosting',
    quantity: '1.5',
    unitPrice: '40',
    taxRate: '',
  })
  await expect(line(page, 2).locator('output')).toHaveText('$60.00')

  const totals = page.locator('dl')
  await expect(totals).toContainText('Subtotal$260.00')
  await expect(totals).toContainText('Discount-$20.00')
  await expect(totals).toContainText('Tax 19%$34.20')
  await expect(totals).toContainText('Total$274.20')

  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL('/invoices')
  await expect(page.getByText('Draft saved')).toBeVisible()
  const row = page.getByRole('row', { name: /Babbage & Co/ })
  await expect(row).toContainText('$274.20')
  await expect(row).toContainText('Draft')

  // Editing keeps what was saved.
  await row.getByRole('link', { name: 'Draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  await expect(line(page, 2).getByLabel('Quantity')).toHaveValue('1.5')
  await expect(line(page, 2).getByLabel('Unit price')).toHaveValue('40.00')
  await page.getByRole('button', { name: 'Remove line 2' }).click()
  await expect(page.getByRole('group', { name: 'Line 2' })).toBeHidden()
  await expect(totals).toContainText('Total$214.20')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL('/invoices')
  await expect(row).toContainText('$214.20')

  // A client with invoices can't be deleted.
  await page.getByRole('link', { name: 'Clients' }).click()
  await page.getByRole('link', { name: 'Babbage & Co' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete client' }).click()
  await expect(
    page.getByText('This client has invoices, so it can’t be deleted.'),
  ).toBeVisible()

  await page.goto('/invoices')
  await row.getByRole('link', { name: 'Draft' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete draft' }).click()
  await expect(page).toHaveURL('/invoices')
  await expect(page.getByText('Draft deleted')).toBeVisible()
  await expect(page.getByText('No invoices yet')).toBeVisible()
})

test('invalid fields are flagged and keep what was typed', async ({ page }) => {
  await signUp(page)
  await addClient(page, 'Lovelace Ltd')
  await page.goto('/invoices/new')

  await fillLine(page, 1, { description: ' ', quantity: 'two', unitPrice: '' })
  await page.getByRole('button', { name: 'Save draft' }).click()

  await expect(page.getByText('Check the highlighted fields.')).toBeVisible()
  await expect(line(page, 1).getByText('Describe the item')).toBeVisible()
  await expect(
    line(page, 1).getByText('Enter a quantity, e.g. 1 or 1.5'),
  ).toBeVisible()
  await expect(
    line(page, 1).getByText('Enter a price, e.g. 12.50'),
  ).toBeVisible()
  await expect(line(page, 1).getByLabel('Quantity')).toHaveValue('two')

  await fillLine(page, 1, {
    description: 'Research',
    quantity: '1',
    unitPrice: '12.505',
  })
  await page.getByLabel('Issue date').fill('2026-10-10')
  await page.getByLabel('Due date').fill('2026-10-01')
  await page.getByRole('button', { name: 'Save draft' }).click()

  await expect(
    page.getByText('Due date can’t be before the issue date'),
  ).toBeVisible()
  await expect(
    line(page, 1).getByText('Use up to 2 decimals for USD'),
  ).toBeVisible()
  await expect(page).toHaveURL('/invoices/new')
})

test.describe('in Tokyo', () => {
  test.use({ timezoneId: 'Asia/Tokyo' })

  test('new invoices are dated today where the business is', async ({
    page,
  }) => {
    await signUp(page)
    await page.goto('/settings/business')
    // Suggests the browser's time zone until one is saved.
    const timeZone = page.getByRole('combobox', { name: 'Time zone' })
    await expect(timeZone).toHaveText('Asia/Tokyo')

    // UTC+14, so its date is a day ahead of UTC's for most of the day.
    await timeZone.click()
    await page.getByRole('option', { name: 'Pacific/Kiritimati' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Business profile saved')).toBeVisible()
    await page.reload()
    await expect(timeZone).toHaveText('Pacific/Kiritimati')

    await addClient(page, 'Faraday Labs')
    await page.goto('/invoices/new')
    const kiritimatiToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Pacific/Kiritimati',
    }).format(new Date())
    await expect(page.getByLabel('Issue date')).toHaveValue(kiritimatiToday)
  })
})

test('invoices are private to their business', async ({ page, browser }) => {
  const owner = page
  await signUp(owner, 'Owner')
  await addClient(owner, 'Secret Client')
  await owner.goto('/invoices/new')
  await fillLine(owner, 1, {
    description: 'Secret work',
    quantity: '1',
    unitPrice: '500',
  })
  await owner.getByRole('button', { name: 'Save draft' }).click()
  await owner.getByRole('link', { name: 'Draft' }).click()
  await expect(owner).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  const invoiceUrl = owner.url()

  // A second user in a separate browser context, with its own address for
  // the rate limiter (see fixtures.ts).
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': '10.255.0.2' },
  })
  const other = await context.newPage()
  await signUp(other, 'Other')
  await other.goto('/invoices')
  await expect(other.getByText('No invoices yet')).toBeVisible()
  expect((await other.goto(invoiceUrl))?.status()).toBe(404)
  expect((await other.goto('/invoices/not-a-uuid'))?.status()).toBe(404)
  await context.close()
})
