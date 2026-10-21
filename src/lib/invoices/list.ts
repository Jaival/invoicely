import type { DisplayStatus } from '@/lib/invoices/status'

// The invoice list's search, view and sort, kept in the URL so a filtered
// list can be bookmarked, shared and reached with the back button.

// The tabs. Open is the to-do list, what's still to send or be paid, and
// the default; All is the ledger.
export const listTabs = ['open', 'overdue', 'draft', 'paid', 'all'] as const
// Also reachable by URL, without a tab of their own.
const otherViews = ['sent', 'void'] as const
export type ListView = (typeof listTabs)[number] | (typeof otherViews)[number]
const listViews: readonly ListView[] = [...listTabs, ...otherViews]

// The statuses each view shows; every status for All.
export const viewStatuses: Record<ListView, DisplayStatus[] | undefined> = {
  open: ['draft', 'sent', 'overdue'],
  overdue: ['overdue'],
  draft: ['draft'],
  paid: ['paid'],
  all: undefined,
  sent: ['sent'],
  void: ['void'],
}

export const sortKeys = ['number', 'client', 'issued', 'due', 'total'] as const
export type SortKey = (typeof sortKeys)[number]
export type SortDirection = 'asc' | 'desc'

export type InvoiceListOptions = {
  search: string
  view: ListView
  // As chosen; the view's own order when unset (see listOrder).
  sort?: SortKey
  dir: SortDirection
}

// How each view is ordered until a column is picked: soonest due first
// where invoices are waiting on payment, which puts the overdue ones on top.
// The rest are newest first.
const viewOrder: Partial<Record<ListView, SortKey>> = {
  open: 'due',
  overdue: 'due',
  sent: 'due',
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
  const view = one(params.status)
  const sort = one(params.sort)
  const dir = one(params.dir)
  return {
    search: one(params.q)?.trim().slice(0, 100) ?? '',
    view: isOneOf(listViews, view) ? view : 'open',
    sort: isOneOf(sortKeys, sort) ? sort : undefined,
    dir: dir === 'asc' || dir === 'desc' ? dir : 'desc',
  }
}

// The order the list is in: the chosen one, or the view's own. Newest first
// when the sort is unset.
export function listOrder({ view, sort, dir }: InvoiceListOptions): {
  sort?: SortKey
  dir: SortDirection
} {
  if (sort) return { sort, dir }
  const own = viewOrder[view]
  return own ? { sort: own, dir: firstDirection[own] } : { dir: 'desc' }
}

// The list's URL with some options changed. Defaults are left out, so the
// plain list is just /invoices.
export function listHref(
  options: InvoiceListOptions,
  changes: Partial<InvoiceListOptions> = {},
) {
  const { search, view, sort, dir } = { ...options, ...changes }
  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (view !== 'open') params.set('status', view)
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
  const order = listOrder(options)
  const dir =
    order.sort === key
      ? order.dir === 'asc'
        ? 'desc'
        : 'asc'
      : firstDirection[key]
  return listHref(options, { sort: key, dir })
}
