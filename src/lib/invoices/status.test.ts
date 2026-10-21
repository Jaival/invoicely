import { describe, expect, it } from 'vitest'

import { displayStatus, dueLabel, paymentDateError } from './status'

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

describe('dueLabel', () => {
  const today = '2026-10-21'
  const label = (
    status: 'draft' | 'sent' | 'paid' | 'void',
    dueDate: string,
    paidOn: string | null = null,
  ) => dueLabel({ status, dueDate, paidOn }, today)

  it('counts the days an invoice is overdue', () => {
    expect(label('sent', '2026-10-20')).toBe('1 day overdue')
    expect(label('sent', '2026-10-09')).toBe('12 days overdue')
  })

  it('counts the days until a sent invoice is due', () => {
    expect(label('sent', today)).toBe('Due today')
    expect(label('sent', '2026-10-22')).toBe('Due tomorrow')
    expect(label('sent', '2026-10-26')).toBe('Due in 5 days')
    expect(label('sent', '2026-11-20')).toBe('Due in 30 days')
  })

  it('gives the date when it’s further off, or not sent yet', () => {
    expect(label('sent', '2026-11-21')).toBe('Due Nov 21')
    expect(label('sent', '2027-01-15')).toBe('Due Jan 15, 2027')
    expect(label('draft', '2026-10-26')).toBe('Due Oct 26')
  })

  it('gives the day a paid invoice was paid', () => {
    expect(label('paid', '2026-10-01', '2026-10-03')).toBe('Paid Oct 3')
  })

  it('gives none for a void invoice', () => {
    expect(label('void', '2026-10-01')).toBeUndefined()
  })
})
