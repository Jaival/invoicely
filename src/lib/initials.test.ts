import { describe, expect, it } from 'vitest'

import { initials } from '@/lib/initials'

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Ada King Lovelace')).toBe('AL')
  })

  it('handles a single name and extra whitespace', () => {
    expect(initials('  cher  ')).toBe('C')
  })

  it('falls back to a placeholder for an empty name', () => {
    expect(initials('   ')).toBe('?')
  })
})
