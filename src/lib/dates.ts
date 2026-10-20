// Calendar dates as stored: "YYYY-MM-DD" strings with no time zone, so an
// invoice dated the 1st reads the 1st wherever it is opened.

const DAY_MS = 24 * 60 * 60 * 1000

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`)

// Today in UTC. Good enough for a default the user can change.
export const today = (now = new Date()) => now.toISOString().slice(0, 10)

export const addDays = (isoDate: string, days: number) =>
  new Date(toDate(isoDate).getTime() + days * DAY_MS).toISOString().slice(0, 10)

// "Oct 1, 2026"
export const formatDate = (isoDate: string, locale = 'en-US') =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(toDate(isoDate))
