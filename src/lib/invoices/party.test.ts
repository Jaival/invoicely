import { partyLines } from '@/lib/invoices/party'
import { describe, expect, it } from 'vitest'

const blank = {
  name: 'Acme',
  email: null,
  taxId: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  region: null,
  postalCode: null,
  country: null,
}

describe('partyLines', () => {
  it('leaves out blank details', () => {
    expect(partyLines(blank)).toEqual([])
  })

  it('prints the address, country name, email and tax ID in order', () => {
    expect(
      partyLines({
        ...blank,
        addressLine1: 'Main St 1',
        postalCode: '10115',
        city: 'Berlin',
        country: 'DE',
        email: 'billing@acme.test',
        taxId: 'DE123',
      }),
    ).toEqual([
      'Main St 1',
      '10115 Berlin',
      'Germany',
      'billing@acme.test',
      'Tax ID DE123',
    ])
  })
})
