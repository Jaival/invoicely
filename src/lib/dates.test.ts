import { describe, expect, it } from 'vitest'

import { addDays, formatDate, today } from './dates'

describe('dates', () => {
  it('gives today as a calendar date', () => {
    expect(today(new Date('2026-10-20T23:30:00Z'))).toBe('2026-10-20')
  })

  it('adds days across months and leap days', () => {
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31')
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('formats without shifting the day', () => {
    expect(formatDate('2026-10-01')).toBe('Oct 1, 2026')
    expect(formatDate('2026-10-01', 'de-DE')).toBe('01.10.2026')
  })
})
