import { describe, expect, it } from 'vitest'

import {
  listHref,
  listOrder,
  pageNumbers,
  parseListOptions,
  sortHref,
} from './list'

describe('parseListOptions', () => {
  it('defaults to the open invoices, in their own order', () => {
    expect(parseListOptions({})).toEqual({
      search: '',
      view: 'open',
      sort: undefined,
      dir: 'desc',
      page: 1,
    })
  })

  it('reads the views without a tab too', () => {
    expect(parseListOptions({ status: 'all' }).view).toBe('all')
    expect(parseListOptions({ status: 'void' }).view).toBe('void')
    expect(parseListOptions({ status: 'sent' }).view).toBe('sent')
  })

  it('reads the search, status and sort', () => {
    expect(
      parseListOptions({
        q: '  babbage ',
        status: 'overdue',
        sort: 'total',
        dir: 'asc',
        page: '3',
      }),
    ).toEqual({
      search: 'babbage',
      view: 'overdue',
      sort: 'total',
      dir: 'asc',
      page: 3,
    })
  })

  it('ignores values it doesn’t recognise or repeated parameters', () => {
    expect(
      parseListOptions({
        q: ['a', 'b'],
        status: 'lost',
        sort: 'secret_column',
        dir: 'sideways',
        page: '-2',
      }),
    ).toEqual({
      search: '',
      view: 'open',
      sort: undefined,
      dir: 'desc',
      page: 1,
    })
    for (const page of ['0', '1.5', 'two', '1e400']) {
      expect(parseListOptions({ page }).page).toBe(1)
    }
  })

  it('caps the search length', () => {
    expect(parseListOptions({ q: 'x'.repeat(500) }).search).toHaveLength(100)
  })
})

describe('listOrder', () => {
  it('puts what’s waiting on payment soonest due first', () => {
    for (const status of ['open', 'overdue', 'sent']) {
      expect(listOrder(parseListOptions({ status }))).toEqual({
        sort: 'due',
        dir: 'asc',
      })
    }
  })

  it('lists the other views newest first', () => {
    for (const status of ['draft', 'paid', 'all', 'void']) {
      expect(listOrder(parseListOptions({ status }))).toEqual({ dir: 'desc' })
    }
  })

  it('keeps a sort picked by hand', () => {
    expect(listOrder(parseListOptions({ sort: 'total', dir: 'asc' }))).toEqual({
      sort: 'total',
      dir: 'asc',
    })
  })
})

describe('listHref', () => {
  const options = parseListOptions({})

  it('leaves out defaults', () => {
    expect(listHref(options)).toBe('/invoices')
    expect(listHref(options, { view: 'all' })).toBe('/invoices?status=all')
  })

  it('keeps the other options when one changes', () => {
    const filtered = parseListOptions({
      q: 'acme & co',
      sort: 'due',
      dir: 'asc',
    })
    expect(listHref(filtered, { view: 'paid' })).toBe(
      '/invoices?q=acme+%26+co&status=paid&sort=due&dir=asc',
    )
    expect(listHref(filtered, { view: 'open', search: '' })).toBe(
      '/invoices?sort=due&dir=asc',
    )
  })
})

describe('pages', () => {
  it('keeps the page until something else changes', () => {
    const options = parseListOptions({ status: 'all', page: '3' })
    expect(listHref(options)).toBe('/invoices?status=all&page=3')
    expect(listHref(options, { page: 4 })).toBe('/invoices?status=all&page=4')
    expect(listHref(options, { page: 1 })).toBe('/invoices?status=all')
    // A new view, sort or search starts again from the first page.
    expect(listHref(options, { view: 'paid' })).toBe('/invoices?status=paid')
    expect(sortHref(options, 'total')).toBe(
      '/invoices?status=all&sort=total&dir=desc',
    )
  })

  it('links the first and last pages, and those around the current one', () => {
    expect(pageNumbers(1, 0)).toEqual([])
    expect(pageNumbers(1, 1)).toEqual([1])
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(pageNumbers(1, 12)).toEqual([1, 2, 'gap', 12])
    expect(pageNumbers(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
    expect(pageNumbers(12, 12)).toEqual([1, 'gap', 11, 12])
    // A gap of a single page shows the page instead.
    expect(pageNumbers(4, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('sortHref', () => {
  it('sorts a new column in its most useful direction first', () => {
    const options = parseListOptions({ status: 'all' })
    expect(sortHref(options, 'total')).toBe(
      '/invoices?status=all&sort=total&dir=desc',
    )
    expect(sortHref(options, 'client')).toBe(
      '/invoices?status=all&sort=client&dir=asc',
    )
    expect(sortHref(options, 'due')).toBe(
      '/invoices?status=all&sort=due&dir=asc',
    )
  })

  it('flips a view’s own order', () => {
    // Open is soonest due first until a column is picked.
    expect(sortHref(parseListOptions({}), 'due')).toBe(
      '/invoices?sort=due&dir=desc',
    )
  })

  it('flips the direction of the current sort', () => {
    const options = parseListOptions({ sort: 'total', dir: 'desc' })
    expect(sortHref(options, 'total')).toBe('/invoices?sort=total&dir=asc')
    expect(
      sortHref(parseListOptions({ sort: 'total', dir: 'asc' }), 'total'),
    ).toBe('/invoices?sort=total&dir=desc')
  })
})
