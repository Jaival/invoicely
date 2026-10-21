import { expect, randomAddress, signUp, test } from './fixtures'
import type { Page } from '@playwright/test'
import { linkFromEmail } from './outbox'

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

test('send an invoice, record its payment, then void it', async ({ page }) => {
  await signUp(page)
  await addClient(page, 'Babbage & Co')
  await page.goto('/invoices/new')
  await fillLine(page, 1, {
    description: 'Design',
    quantity: '2',
    unitPrice: '100',
  })
  // Due in the past, so it's overdue as soon as it's sent.
  await page.getByLabel('Issue date').fill('2026-01-05')
  await page.getByLabel('Due date').fill('2026-02-04')

  await page.getByRole('button', { name: 'Mark as sent' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByRole('button', { name: 'Mark as sent' }).click()

  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  await expect(page.getByText('INV-0001 marked as sent')).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'INV-0001' }),
  ).toBeVisible()
  const status = page.locator('[data-slot="badge"]')
  await expect(status).toHaveText('Overdue')
  await expect(page.getByRole('region', { name: 'Bill to' })).toContainText(
    'Babbage & Co',
  )
  await expect(page.getByRole('row', { name: /Design/ })).toContainText(
    '$200.00',
  )
  // Sent invoices can't be edited.
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeHidden()

  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(dialog.getByLabel('Payment date')).not.toHaveValue('')
  await dialog.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Marked as paid')).toBeVisible()
  await expect(status).toHaveText('Paid')

  // A mistaken payment can be undone, but a paid invoice can't be voided.
  await expect(page.getByRole('button', { name: 'Void' })).toBeHidden()
  await page.getByRole('button', { name: 'Mark as unpaid' }).click()
  await expect(status).toHaveText('Overdue')

  await page.getByRole('button', { name: 'Void' }).click()
  await dialog.getByRole('button', { name: 'Void invoice' }).click()
  await expect(page.getByText('Invoice voided')).toBeVisible()
  await expect(status).toHaveText('Void')
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeHidden()

  // Every change is logged, oldest first.
  await expect(
    page.getByRole('region', { name: 'Activity' }).getByRole('listitem'),
  ).toContainText(['Sent', 'Marked paid, received', 'Marked unpaid', 'Voided'])

  await page.goto('/invoices')
  const row = page.getByRole('row', { name: /INV-0001/ })
  await expect(row).toContainText('Babbage & Co')
  await expect(row).toContainText('Void')
})

test('search, filter and sort the invoice list', async ({ page }) => {
  await signUp(page)
  await addClient(page, 'Ada Analytics')
  await addClient(page, 'Babbage & Co')

  async function createInvoice(
    client: string,
    unitPrice: string,
    { dueDate, send }: { dueDate?: string; send?: boolean } = {},
  ) {
    await page.goto('/invoices/new')
    await page.getByRole('combobox', { name: 'Client' }).click()
    await page.getByRole('option', { name: client }).click()
    await fillLine(page, 1, { description: 'Work', quantity: '1', unitPrice })
    if (dueDate) {
      await page.getByLabel('Issue date').fill('2026-01-01')
      await page.getByLabel('Due date').fill(dueDate)
    }
    if (send) {
      await page.getByRole('button', { name: 'Mark as sent' }).click()
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Mark as sent' })
        .click()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await page.getByRole('button', { name: 'Save draft' }).click()
      await expect(page).toHaveURL('/invoices')
    }
  }

  // Due 30 days from today by default, so not overdue.
  await createInvoice('Ada Analytics', '100', { send: true })
  await createInvoice('Babbage & Co', '300', {
    dueDate: '2026-01-31',
    send: true,
  })
  await createInvoice('Babbage & Co', '200')

  await page.goto('/invoices')
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') })
  await expect(rows).toHaveCount(3)

  // The status filter shows how many invoices each status has.
  const filters = page.getByRole('navigation', { name: 'Filter by status' })
  await expect(filters.getByRole('link', { name: 'All 3' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await filters.getByRole('link', { name: 'Overdue 1' }).click()
  await expect(page).toHaveURL('/invoices?status=overdue')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('INV-0002')

  // A search keeps the status filter.
  await page.getByLabel('Search invoices').fill('ada')
  await page.getByLabel('Search invoices').press('Enter')
  await expect(page).toHaveURL('/invoices?q=ada&status=overdue')
  await expect(page.getByText('No invoices match these filters.')).toBeVisible()
  await expect(filters.getByRole('link', { name: 'All 1' })).toBeVisible()
  await filters.getByRole('link', { name: 'All 1' }).click()
  await expect(page).toHaveURL('/invoices?q=ada')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Ada Analytics')

  // Sorting: largest total first, then the other way.
  await page.goto('/invoices')
  const total = page.getByRole('columnheader', { name: 'Total' })
  await total.getByRole('link').click()
  await expect(total).toHaveAttribute('aria-sort', 'descending')
  await expect(rows.first()).toContainText('$300.00')
  await total.getByRole('link').click()
  await expect(total).toHaveAttribute('aria-sort', 'ascending')
  await expect(rows.first()).toContainText('$100.00')
  // Drafts have no number, so they're last however numbers sort.
  await page
    .getByRole('columnheader', { name: 'Number' })
    .getByRole('link')
    .click()
  await expect(rows.first()).toContainText('INV-0002')
  await expect(rows.last()).toContainText('Draft')
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
  await owner.getByRole('link', { name: 'Draft', exact: true }).click()
  await expect(owner).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  const invoiceUrl = owner.url()

  // A second user in a separate browser context, with its own address for
  // the rate limiter (see fixtures.ts).
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomAddress() },
  })
  const other = await context.newPage()
  await signUp(other, 'Other')
  await other.goto('/invoices')
  await expect(other.getByText('No invoices yet')).toBeVisible()
  expect((await other.goto(invoiceUrl))?.status()).toBe(404)
  expect((await other.goto('/invoices/not-a-uuid'))?.status()).toBe(404)
  await context.close()
})

test('sending emails the client a link they can open signed out', async ({
  page,
  browser,
}) => {
  await signUp(page)
  const clientEmail = `client-${crypto.randomUUID()}@example.com`
  await page.goto('/clients/new')
  await page.getByLabel('Name').fill('Lovelace Ltd')
  await page.getByLabel('Email').fill(clientEmail)
  await page.getByRole('button', { name: 'Add client' }).click()
  await expect(page).toHaveURL('/clients')

  await page.goto('/invoices/new')
  await fillLine(page, 1, {
    description: 'Audit',
    quantity: '1',
    unitPrice: '50',
  })
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Mark as sent' })
    .click()
  await expect(page.getByText(`INV-0001 sent to ${clientEmail}`)).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Activity' }).getByRole('listitem'),
  ).toContainText(['Sent', `Emailed to ${clientEmail}`])

  const link = await linkFromEmail(clientEmail, /^Invoice INV-0001 from /)
  expect(link).toMatch(/\/i\/[\w-]{32}$/)

  // The client has no account: a fresh context with no session.
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomAddress() },
  })
  const client = await context.newPage()
  await client.goto(link)
  await expect(
    client.getByRole('heading', { level: 1, name: 'Invoice INV-0001' }),
  ).toBeVisible()
  await expect(client.getByRole('region', { name: 'Bill to' })).toContainText(
    'Lovelace Ltd',
  )
  const pdf = await client.request.get(`${link}/pdf`)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  await context.close()
})
