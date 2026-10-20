import { describe, expect, it } from 'vitest'

import { formatInvoiceNumber } from './number'

describe('formatInvoiceNumber', () => {
  it('pads the sequence to four digits', () => {
    expect(formatInvoiceNumber('INV', 1)).toBe('INV-0001')
    expect(formatInvoiceNumber('INV', 42)).toBe('INV-0042')
  })

  it('lets longer sequences grow', () => {
    expect(formatInvoiceNumber('INV', 12345)).toBe('INV-12345')
  })

  it('uses the prefix as given', () => {
    expect(formatInvoiceNumber('ACME-2026', 7)).toBe('ACME-2026-0007')
  })
})
