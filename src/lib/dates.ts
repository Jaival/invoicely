// Calendar dates as stored: "YYYY-MM-DD" strings with no time zone, so an
// invoice dated the 1st reads the 1st wherever it is opened.

const DAY_MS = 24 * 60 * 60 * 1000

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`)

// Today's date in a time zone: the business's, so the day turns over at its
// midnight rather than at midnight UTC.
export function today(timeZone = 'UTC', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((found) => found.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export const addDays = (isoDate: string, days: number) =>
  new Date(toDate(isoDate).getTime() + days * DAY_MS).toISOString().slice(0, 10)

// "Oct 1, 2026"
export const formatDate = (isoDate: string, locale = 'en-US') =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(toDate(isoDate))

// "Oct 1, 2026, 4:05 PM": a moment, as the clock read in a time zone.
export const formatDateTime = (
  moment: Date,
  timeZone = 'UTC',
  locale = 'en-US',
) =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(moment)

// Whether the runtime knows an IANA time zone, e.g. "Europe/Berlin".
export function isTimeZone(timeZone: string) {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

// "America/New York": an IANA name, readable.
export const timeZoneLabel = (timeZone: string) => timeZone.replaceAll('_', ' ')
