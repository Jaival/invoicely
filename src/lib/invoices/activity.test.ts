import { describe, expect, it } from 'vitest'

import { describeEvent } from './activity'

describe('describeEvent', () => {
  it('describes each event', () => {
    expect(describeEvent({ type: 'sent', data: null })).toBe('Sent')
    expect(
      describeEvent({ type: 'emailed', data: { to: 'ada@example.com' } }),
    ).toBe('Emailed to ada@example.com')
    expect(
      describeEvent({ type: 'paid', data: { paidOn: '2026-10-15' } }),
    ).toBe('Marked paid, received Oct 15, 2026')
    expect(describeEvent({ type: 'unpaid', data: null })).toBe('Marked unpaid')
    expect(describeEvent({ type: 'voided', data: null })).toBe('Voided')
  })

  it('reads well without the details', () => {
    expect(describeEvent({ type: 'emailed', data: null })).toBe(
      'Emailed to the client',
    )
    expect(describeEvent({ type: 'paid', data: {} })).toBe('Marked paid')
  })
})
