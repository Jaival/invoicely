import { expect, test } from '@playwright/test'

test('home page shows the Invoicely landing', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Invoicely')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Invoicely' }),
  ).toBeVisible()
})
