import { render } from '@react-email/components'
import { describe, expect, it } from 'vitest'

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
