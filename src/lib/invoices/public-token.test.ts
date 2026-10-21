import { isPublicToken, newPublicToken } from '@/lib/invoices/public-token'
import { describe, expect, it } from 'vitest'

describe('public tokens', () => {
  it('are URL-safe and never repeat', () => {
    const tokens = Array.from({ length: 100 }, newPublicToken)
    expect(tokens.every(isPublicToken)).toBe(true)
    expect(new Set(tokens).size).toBe(100)
  })

  it('rejects anything else', () => {
    for (const value of ['', 'short', 'a'.repeat(33), `${'a'.repeat(31)}/`]) {
      expect(isPublicToken(value)).toBe(false)
    }
  })
})
