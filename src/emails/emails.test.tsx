import { render } from '@react-email/components'
import { describe, expect, it } from 'vitest'

import { NewInvoiceEmail } from './new-invoice'
import { ResetPasswordEmail } from './reset-password'
import { VerifyEmail } from './verify-email'

const url = 'https://invoicely.example/api/auth/verify-email?token=abc&x=1'

describe('account emails', () => {
  it('verification email greets the user and carries the link', async () => {
    const text = await render(VerifyEmail({ name: 'Ada', url }), {
      plainText: true,
    })
    expect(text).toContain('Hi Ada')
    expect(text).toContain(url)
  })

  it('reset email puts the link on the button', async () => {
    const html = await render(ResetPasswordEmail({ name: 'Ada', url }))
    expect(html).toContain(`href="${url.replace('&', '&amp;')}"`)
    expect(html).toContain('Choose a new password')
  })
})

describe('invoice emails', () => {
  it('names the business, amount and due date, and links the invoice', async () => {
    const link = 'https://invoicely.example/i/abc'
    const text = await render(
      NewInvoiceEmail({
        businessName: 'Acme',
        number: 'INV-0001',
        amount: '€1,190.00',
        dueDate: 'Oct 15, 2026',
        url: link,
      }),
      { plainText: true },
    )
    expect(text).toContain('NEW INVOICE FROM ACME')
    expect(text).toContain(
      'Invoice INV-0001 for €1,190.00 is due on Oct 15, 2026',
    )
    expect(text).toContain(link)
  })
})
