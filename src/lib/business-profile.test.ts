import { describe, expect, it } from 'vitest'

import { businessProfileSchema, detectLogoType } from '@/lib/business-profile'

const valid = {
  name: '  Lovelace Analytics ',
  email: '',
  taxId: '',
  addressLine1: '12 Engine Row',
  addressLine2: '',
  city: 'London',
  region: '',
  postalCode: 'N1 9GU',
  country: 'GB',
  defaultCurrency: 'GBP',
  invoicePrefix: 'la-',
  timeZone: 'Europe/London',
  publicStyle: 'match',
}

describe('businessProfileSchema', () => {
  it('trims text, turns blanks into null and uppercases the prefix', () => {
    expect(businessProfileSchema.parse(valid)).toEqual({
      name: 'Lovelace Analytics',
      email: null,
      taxId: null,
      addressLine1: '12 Engine Row',
      addressLine2: null,
      city: 'London',
      region: null,
      postalCode: 'N1 9GU',
      country: 'GB',
      defaultCurrency: 'GBP',
      invoicePrefix: 'LA-',
      timeZone: 'Europe/London',
      publicStyle: 'match',
    })
  })

  it('allows no country but requires a known one when set', () => {
    expect(businessProfileSchema.parse({ ...valid, country: '' }).country).toBe(
      null,
    )
    expect(
      businessProfileSchema.safeParse({ ...valid, country: 'UK' }).success,
    ).toBe(false)
  })

  it('rejects an unknown currency, a bad email, a bad prefix, an unknown time zone and an unknown public style', () => {
    const result = businessProfileSchema.safeParse({
      ...valid,
      defaultCurrency: 'XXX',
      email: 'not-an-email',
      invoicePrefix: 'INV 2026!',
      timeZone: 'London',
      publicStyle: 'loud',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'email',
      'defaultCurrency',
      'invoicePrefix',
      'timeZone',
      'publicStyle',
    ])
  })

  it('requires a business name', () => {
    expect(
      businessProfileSchema.safeParse({ ...valid, name: '  ' }).success,
    ).toBe(false)
  })
})

describe('detectLogoType', () => {
  it('recognises PNG and JPEG by their signatures', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    expect(detectLogoType(png)?.contentType).toBe('image/png')
    expect(detectLogoType(jpeg)?.contentType).toBe('image/jpeg')
  })

  it('rejects anything else, such as SVG', () => {
    const svg = new TextEncoder().encode('<svg xmlns=')
    expect(detectLogoType(svg)).toBeNull()
  })
})
