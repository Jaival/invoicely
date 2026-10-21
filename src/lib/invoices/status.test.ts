import { describe, expect, it } from 'vitest'

import { displayStatus, paymentDateError } from './status'

describe('displayStatus', () => {
  const today = '2026-10-21'

  it('shows sent invoices past their due date as overdue', () => {
    expect(
      displayStatus({ status: 'sent', dueDate: '2026-10-20' }, today),
    ).toBe('overdue')
  })

  it('keeps sent invoices due today or later as sent', () => {
    expect(displayStatus({ status: 'sent', dueDate: today }, today)).toBe(
      'sent',
    )
    expect(
      displayStatus({ status: 'sent', dueDate: '2026-11-01' }, today),
    ).toBe('sent')
  })

  it('never shows drafts, paid or void invoices as overdue', () => {
    for (const status of ['draft', 'paid', 'void'] as const) {
      expect(displayStatus({ status, dueDate: '2026-01-01' }, today)).toBe(
        status,
      )
    }
  })
})

describe('paymentDateError', () => {
  const today = '2026-10-21'

  it('accepts today and earlier days', () => {
    expect(paymentDateError(today, today)).toBeUndefined()
    expect(paymentDateError('2026-09-30', today)).toBeUndefined()
  })

  it('rejects future days', () => {
    expect(paymentDateError('2026-10-22', today)).toBe(
      'The payment date can’t be in the future',
    )
  })

  it('rejects anything that is not a date', () => {
    for (const input of [
      '',
      'yesterday',
      '2026-13-01',
      '2026-02-30',
      '21/10/2026',
    ]) {
      expect(paymentDateError(input, today)).toBe(
        'Pick the day the payment arrived',
      )
    }
  })
})
