import { expect, signUp, test } from './fixtures'
import { businessOf, seedClient, seedInvoice, seedPayment } from './seed'

test('the dashboard adds up what’s owed and paid, per currency', async ({
  page,
}) => {
  const business = await businessOf(await signUp(page))

  // A new account has nothing to add up yet.
  await expect(page.getByText('Nothing to add up yet')).toBeVisible()
  await expect(page.getByRole('link', { name: 'New invoice' })).toBeVisible()

  const client = await seedClient(business, 'Ada Analytics')
  // $300 overdue, $100 of it paid today.
  const late = await seedInvoice(business, client, 30000, {
    issueDate: '2026-01-01',
    dueDate: '2026-01-31',
  })
  await seedPayment(business, late, 10000)
  // €200 not due yet, and €50 paid in full today.
  await seedInvoice(business, client, 20000, { currency: 'EUR' })
  const paid = await seedInvoice(business, client, 5000, { currency: 'EUR' })
  await seedPayment(business, paid, 5000)
  // Drafts aren't owed.
  await seedInvoice(business, client, 99900, { draft: true })

  await page.reload()
  const totals = page.getByRole('definition')
  const figure = (name: string) =>
    page.getByRole('term').filter({ hasText: name })
  // Each currency on its own line, in code order, never added together.
  await expect(totals).toHaveText([
    '€200.00$200.00',
    '$200.00',
    '€50.00$100.00',
  ])

  // Each figure opens the matching tab of the invoice list.
  await figure('Outstanding').getByRole('link').click()
  await expect(page).toHaveURL('/invoices')
  await page.goBack()
  await figure('Overdue').getByRole('link').click()
  await expect(page).toHaveURL('/invoices?status=overdue')
  await page.goBack()
  await figure('Paid this month').getByRole('link').click()
  await expect(page).toHaveURL('/invoices?status=paid')
})
