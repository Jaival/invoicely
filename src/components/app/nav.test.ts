import { describe, expect, it } from 'vitest'

import { segmentTitle } from '@/components/app/nav'

const titles = (path: string) => {
  const segments = path.split('/').filter(Boolean)
  return segments.map((_, index) => segmentTitle(segments, index))
}

describe('segmentTitle', () => {
  it('labels known segments', () => {
    expect(titles('/settings/business')).toEqual(['Settings', 'Business'])
  })

  it('labels new and record pages from their collection', () => {
    expect(titles('/clients/new')).toEqual(['Clients', 'New client'])
    expect(titles('/invoices/new')).toEqual(['Invoices', 'New invoice'])
    expect(titles('/clients/0199f6a4-7b1c-7000-8000-000000000000')).toEqual([
      'Clients',
      'Client',
    ])
  })

  it('falls back to the raw segment', () => {
    expect(titles('/unknown')).toEqual(['unknown'])
  })
})
