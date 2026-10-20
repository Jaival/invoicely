import { describe, expect, it } from 'vitest'

import { containsPattern } from '@/lib/search'

describe('containsPattern', () => {
  it('wraps the term in wildcards', () => {
    expect(containsPattern('acme')).toBe('%acme%')
  })

  it('escapes LIKE wildcards and the escape character', () => {
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%')
  })
})
