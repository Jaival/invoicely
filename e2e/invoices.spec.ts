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

  // Void invoices aren't open; the All tab still lists them.
  await page.goto('/invoices?status=all')
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

  // Open is the default, with how many invoices each tab has: overdue
  // first, then soonest due, drafts last.
  const filters = page.getByRole('navigation', { name: 'Filter by status' })
  await expect(filters.getByRole('link', { name: 'Open 3' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  await expect(page.getByRole('columnheader', { name: 'Due' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  )
  await expect(rows.nth(0)).toContainText('INV-0002')
  await expect(rows.nth(1)).toContainText('INV-0001')
  await expect(rows.nth(2)).toContainText('Draft')

  // When each is due, in words, and what's owed in total.
  await expect(rows.nth(0)).toContainText(/\d+ days overdue/)
  await expect(rows.nth(1)).toContainText('Due in 30 days')
  const owed = (term: string) =>
    page.locator('dt', { hasText: term }).locator('..')
  await expect(owed('Outstanding')).toContainText('$400.00')
  await expect(owed('Overdue')).toContainText('$300.00')
  // The issue date is for the ledger, on All only.
  await expect(page.getByRole('columnheader', { name: 'Issued' })).toBeHidden()
  await expect(filters.getByRole('link')).toHaveText([
    'Open3',
    'Overdue1',
    'Drafts1',
    'Paid0',
    'All3',
  ])

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
  await expect(page).toHaveURL('/invoices?q=ada&status=all')
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('Ada Analytics')

  // Sorting: largest total first, then the other way.
  await page.goto('/invoices?status=all')
  await expect(page.getByRole('columnheader', { name: 'Issued' })).toBeVisible()
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

  // Pages of 50: one page needs no page links, and a page past the end
  // points back to the first.
  await expect(page.getByRole('navigation', { name: 'Pages' })).toBeHidden()
  await page.goto('/invoices?status=all&page=2')
  await page.getByRole('link', { name: 'Go to the first page' }).click()
  await expect(page).toHaveURL('/invoices?status=all')
  await expect(rows).toHaveCount(3)
})

test('act on invoices from the list', async ({ page }) => {
  await signUp(page)
  await addClient(page, 'Babbage & Co')
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
  await expect(
    page.getByRole('heading', { level: 1, name: 'INV-0001' }),
  ).toBeVisible()

  // Paid from its row; it leaves the Open tab.
  await page.goto('/invoices')
  await page.getByRole('button', { name: 'Actions for INV-0001' }).click()
  await page.getByRole('menuitem', { name: 'Mark as paid…' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Mark as paid' })
    .click()
  await expect(page.getByText('Marked as paid')).toBeVisible()
  await expect(
    page.getByText('Nothing open: every invoice is paid or void.'),
  ).toBeVisible()

  // Duplicated into a new draft, ready to edit.
  await page.goto('/invoices?status=paid')
  await page.getByRole('button', { name: 'Actions for INV-0001' }).click()
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(page.getByText('Duplicated as a new draft')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible()
  await expect(line(page, 1).getByLabel('Description')).toHaveValue('Audit')

  // Deleted from its row.
  await page.goto('/invoices')
  await page
    .getByRole('button', { name: 'Actions for the draft for Babbage & Co' })
    .click()
  await page.getByRole('menuitem', { name: 'Delete…' }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Delete draft' })
    .click()
  await expect(page.getByText('Draft deleted')).toBeVisible()
  await expect(
    page.getByText('Nothing open: every invoice is paid or void.'),
  ).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the list shows a card per invoice', async ({ page }) => {
    await signUp(page)
    await addClient(page, 'Babbage & Co')
    await page.goto('/invoices/new')
    await fillLine(page, 1, {
      description: 'Audit',
      quantity: '1',
      unitPrice: '50',
    })
    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page).toHaveURL('/invoices')

    await expect(page.getByRole('table')).toBeHidden()
    const card = page
      .getByRole('list', { name: 'Invoices' })
      .getByRole('listitem')
    await expect(card).toHaveCount(1)
    await expect(card).toContainText('Babbage & Co')
    await expect(card).toContainText('$50.00')
    await expect(card).toContainText(/Draft · Due/)
    await expect(
      card.getByRole('button', {
        name: 'Actions for the draft for Babbage & Co',
      }),
    ).toBeVisible()

    // The whole card opens the invoice.
    await card.getByRole('link', { name: 'Babbage & Co' }).click()
    await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible()
  })
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

  // Printed, it's just the invoice, in black on white even in dark mode.
  const print = client.getByRole('button', { name: 'Print' })
  const background = () =>
    client.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await expect(print).toBeVisible()
  const onScreen = await background()
  await client.emulateMedia({ media: 'print', colorScheme: 'dark' })
  await expect(print).toBeHidden()
  await expect(client.getByText('Sent with Invoicely')).toBeHidden()
  await expect(client.locator('html')).toHaveCSS('color-scheme', 'light')
  expect(await background()).not.toBe(onScreen)
  await client.emulateMedia({ media: 'screen' })

  const pdf = await client.request.get(`${link}/pdf`)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  await context.close()
})

test("clients see invoices in the business's public style", async ({
  page,
  browser,
}) => {
  await signUp(page)
  await page.goto('/settings/appearance')
  await page.getByRole('radio', { name: 'Brutal' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-style', 'brutal')

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
  const link = await linkFromEmail(clientEmail, /^Invoice INV-0001 from /)

  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-forwarded-for': randomAddress() },
  })
  const client = await context.newPage()
  const invoice = client.locator('div[data-style]')
  const download = client.getByRole('link', { name: 'Download PDF' })
  // Brutal's outline buttons sit on a 4px black shadow.
  const hardShadow = /rgb\(10, 10, 10\) 4px 4px 0px 0px/

  // Clean by default, even for the owner, whose own pages are Brutal.
  await client.goto(link)
  await expect(invoice).toHaveAttribute('data-style', 'clean')
  await page.goto(link)
  await expect(page.locator('html')).toHaveAttribute('data-style', 'brutal')
  await expect(page.locator('div[data-style]')).toHaveAttribute(
    'data-style',
    'clean',
  )
  await expect(page.getByRole('link', { name: 'Download PDF' })).not.toHaveCSS(
    'box-shadow',
    hardShadow,
  )

  // Matching the owner's style: Brutal, with its hard shadows.
  await page.goto('/settings/business')
  await page.getByRole('combobox', { name: 'Public invoice style' }).click()
  await page.getByRole('option', { name: 'Match my style' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Business profile saved')).toBeVisible()

  await client.reload()
  await expect(invoice).toHaveAttribute('data-style', 'brutal')
  await expect(invoice).toHaveAttribute('data-palette', 'emerald')
  await expect(download).toHaveCSS('box-shadow', hardShadow)
  const pdf = await client.request.get(`${link}/pdf`)
  expect(pdf.headers()['content-type']).toBe('application/pdf')
  expect((await pdf.body()).toString('latin1')).toContain('SpaceGrotesk')
  await context.close()
})
