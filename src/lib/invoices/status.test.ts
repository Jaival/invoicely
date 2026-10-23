import { describe, expect, it } from 'vitest'

import { displayStatus, dueLabel, isOwed, paymentDateError } from './status'

describe('displayStatus', () => {
  const today = '2026-10-21'

  it('shows sent invoices past their due date as overdue', () => {
    expect(
      displayStatus(
        { status: 'sent', dueDate: '2026-10-20', amountPaid: 0 },
        today,
      ),
    ).toBe('overdue')
  })

  it('keeps sent invoices due today or later as sent', () => {
    expect(
      displayStatus({ status: 'sent', dueDate: today, amountPaid: 0 }, today),
    ).toBe('sent')
    expect(
      displayStatus(
        { status: 'sent', dueDate: '2026-11-01', amountPaid: 0 },
        today,
      ),
    ).toBe('sent')
  })

  it('never shows drafts, paid or void invoices as overdue', () => {
    for (const status of ['draft', 'paid', 'void'] as const) {
      expect(
        displayStatus({ status, dueDate: '2026-01-01', amountPaid: 0 }, today),
      ).toBe(status)
    }
  })

  it('shows sent invoices with something paid as partially paid', () => {
    expect(
      displayStatus({ status: 'sent', dueDate: today, amountPaid: 1 }, today),
    ).toBe('partially_paid')
  })

  it('shows them as overdue once they are late', () => {
    expect(
      displayStatus(
        { status: 'sent', dueDate: '2026-10-20', amountPaid: 1 },
        today,
      ),
    ).toBe('overdue')
  })
})

describe('isOwed', () => {
  it('is true while some of the money is still to come', () => {
    expect(isOwed('sent')).toBe(true)
    expect(isOwed('partially_paid')).toBe(true)
    expect(isOwed('overdue')).toBe(true)
    for (const status of ['draft', 'paid', 'void'] as const) {
      expect(isOwed(status)).toBe(false)
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
    amountPaid = 0,
  ) =>
    dueLabel(
      { status, dueDate, paidOn, amountPaid, total: 10000, currency: 'EUR' },
      today,
    )

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

  it('adds what’s left once part is paid', () => {
    expect(label('sent', '2026-10-26', null, 2500)).toBe(
      'Due in 5 days · €75.00 left',
    )
    expect(label('sent', '2026-10-09', null, 2500)).toBe(
      '12 days overdue · €75.00 left',
    )
    expect(label('sent', '2026-12-01', null, 2500)).toBe(
      'Due Dec 1 · €75.00 left',
    )
  })

  it('gives none for a void invoice', () => {
    expect(label('void', '2026-10-01')).toBeUndefined()
  })
})
