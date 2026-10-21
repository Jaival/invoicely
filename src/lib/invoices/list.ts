import type { DisplayStatus } from '@/lib/invoices/status'

// The invoice list's search, status filter and sort, kept in the URL so a
// filtered list can be bookmarked, shared and reached with the back button.

export const listStatuses = [
  'draft',
  'sent',
  'overdue',
  'paid',
  'void',
] as const satisfies DisplayStatus[]

export const sortKeys = ['number', 'client', 'issued', 'due', 'total'] as const
export type SortKey = (typeof sortKeys)[number]
export type SortDirection = 'asc' | 'desc'

export type InvoiceListOptions = {
  search: string
  // All statuses when unset.
  status?: DisplayStatus
  // Newest first when unset.
  sort?: SortKey
  dir: SortDirection
}

// The direction a column sorts in when first clicked: the most useful end
// first, e.g. the latest numbers and dates, the largest totals, and the
// soonest due.
const firstDirection: Record<SortKey, SortDirection> = {
  number: 'desc',
  client: 'asc',
  issued: 'desc',
  due: 'asc',
  total: 'desc',
}

type SearchParams = Record<string, string | string[] | undefined>

const one = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined

const isOneOf = <T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T => values.includes(value as T)

// Reads the options from the URL, ignoring anything it doesn't recognise.
export function parseListOptions(params: SearchParams): InvoiceListOptions {
  const status = one(params.status)
  const sort = one(params.sort)
  const dir = one(params.dir)
  return {
    search: one(params.q)?.trim().slice(0, 100) ?? '',
    status: isOneOf(listStatuses, status) ? status : undefined,
    sort: isOneOf(sortKeys, sort) ? sort : undefined,
    dir: dir === 'asc' || dir === 'desc' ? dir : 'desc',
  }
}

// The list's URL with some options changed. Defaults are left out, so the
// plain list is just /invoices.
export function listHref(
  options: InvoiceListOptions,
  changes: Partial<InvoiceListOptions> = {},
) {
  const { search, status, sort, dir } = { ...options, ...changes }
  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (status) params.set('status', status)
  if (sort) {
    params.set('sort', sort)
    params.set('dir', dir)
  }
  const query = params.toString()
  return query ? `/invoices?${query}` : '/invoices'
}

// Where clicking a column header goes: the other direction if the list is
// already sorted by it, otherwise its first direction.
export function sortHref(options: InvoiceListOptions, key: SortKey) {
  const dir =
    options.sort === key
      ? options.dir === 'asc'
        ? 'desc'
        : 'asc'
      : firstDirection[key]
  return listHref(options, { sort: key, dir })
}
