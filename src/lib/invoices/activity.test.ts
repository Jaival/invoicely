import { describe, expect, it } from 'vitest'

import { describeEvent } from './activity'

const inWords = (event: Parameters<typeof describeEvent>[0]) =>
  describeEvent(event, 'EUR')

describe('describeEvent', () => {
  it('describes each event', () => {
    expect(inWords({ type: 'sent', data: null })).toBe('Sent')
    expect(inWords({ type: 'emailed', data: { to: 'ada@example.com' } })).toBe(
      'Emailed to ada@example.com',
    )
    expect(inWords({ type: 'paid', data: { paidOn: '2026-10-15' } })).toBe(
      'Marked paid, received Oct 15, 2026',
    )
    expect(inWords({ type: 'unpaid', data: null })).toBe('Marked unpaid')
    const payment = { amount: 12050, paidOn: '2026-10-15' }
    expect(inWords({ type: 'payment_recorded', data: payment })).toBe(
      'Payment of €120.50 received Oct 15, 2026',
    )
    expect(inWords({ type: 'payment_removed', data: payment })).toBe(
      'Payment of €120.50 received Oct 15, 2026 removed',
    )
    expect(inWords({ type: 'voided', data: null })).toBe('Voided')
  })

  it('reads well without the details', () => {
    expect(inWords({ type: 'emailed', data: null })).toBe(
      'Emailed to the client',
    )
    expect(inWords({ type: 'paid', data: {} })).toBe('Marked paid')
    expect(inWords({ type: 'payment_recorded', data: null })).toBe('Payment')
  })
})
