import { describe, expect, it } from 'vitest'

import { organizationSlug } from '@/lib/slug'

describe('organizationSlug', () => {
  it('lowercases, strips accents and joins words with hyphens', () => {
    expect(organizationSlug('  José Müller & Co. ', 'abc12345')).toBe(
      'jose-muller-co-abc12345',
    )
  })

  it('falls back to the suffix when the name has no usable characters', () => {
    expect(organizationSlug('株式会社', 'abc12345')).toBe('abc12345')
  })

  it('caps the name part at 40 characters without a trailing hyphen', () => {
    const slug = organizationSlug(`${'a'.repeat(39)} b`, 'abc12345')
    expect(slug).toBe(`${'a'.repeat(39)}-abc12345`)
  })

  it('adds a random suffix by default', () => {
    expect(organizationSlug('Alex')).toMatch(/^alex-[0-9a-f]{8}$/)
    expect(organizationSlug('Alex')).not.toBe(organizationSlug('Alex'))
  })
})
