import { describe, expect, it } from 'vitest'

import {
  addDays,
  daysBetween,
  formatDate,
  formatDateTime,
  formatShortDate,
  isTimeZone,
  timeZoneLabel,
  today,
} from './dates'

describe('dates', () => {
  it('gives today as a calendar date, in UTC by default', () => {
    expect(today(undefined, new Date('2026-10-20T23:30:00Z'))).toBe(
      '2026-10-20',
    )
  })

  it('gives today in the business’s time zone', () => {
    // 00:30 in Berlin (UTC+2 in summer) is still the previous day in UTC.
    const now = new Date('2026-10-20T22:30:00Z')
    expect(today('Europe/Berlin', now)).toBe('2026-10-21')
    expect(today('America/New_York', now)).toBe('2026-10-20')
    // Across a year end, too.
    expect(today('Pacific/Auckland', new Date('2026-12-31T12:00:00Z'))).toBe(
      '2027-01-01',
    )
  })

  it('adds days across months and leap days', () => {
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31')
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('counts the days between dates', () => {
    expect(daysBetween('2026-10-21', '2026-10-21')).toBe(0)
    expect(daysBetween('2026-10-21', '2026-11-02')).toBe(12)
    expect(daysBetween('2026-10-21', '2026-10-09')).toBe(-12)
    // Across the end of summer time, still whole days.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('leaves the year out of short dates in the current year', () => {
    expect(formatShortDate('2026-10-03', '2026-10-21')).toBe('Oct 3')
    expect(formatShortDate('2025-12-30', '2026-01-02')).toBe('Dec 30, 2025')
  })

  it('formats without shifting the day', () => {
    expect(formatDate('2026-10-01')).toBe('Oct 1, 2026')
    expect(formatDate('2026-10-01', 'de-DE')).toBe('01.10.2026')
  })

  it('formats a moment as the clock read in a time zone', () => {
    const moment = new Date('2026-10-20T22:30:00Z')
    // ICU puts a narrow no-break space before AM/PM.
    const plain = (text: string) => text.replace(/\s/g, ' ')
    expect(plain(formatDateTime(moment))).toBe('Oct 20, 2026, 10:30 PM')
    expect(plain(formatDateTime(moment, 'Europe/Berlin'))).toBe(
      'Oct 21, 2026, 12:30 AM',
    )
  })

  it('recognises IANA time zones', () => {
    expect(isTimeZone('Europe/Berlin')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus_Mons')).toBe(false)
    expect(isTimeZone('')).toBe(false)
  })

  it('labels time zones readably', () => {
    expect(timeZoneLabel('America/New_York')).toBe('America/New York')
  })
})
