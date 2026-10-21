import { describe, expect, it } from 'vitest'

import { listHref, listOrder, parseListOptions, sortHref } from './list'

describe('parseListOptions', () => {
  it('defaults to the open invoices, in their own order', () => {
    expect(parseListOptions({})).toEqual({
      search: '',
      view: 'open',
      sort: undefined,
      dir: 'desc',
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
      }),
    ).toEqual({
      search: 'babbage',
      view: 'overdue',
      sort: 'total',
      dir: 'asc',
    })
  })

  it('ignores values it doesn’t recognise or repeated parameters', () => {
    expect(
      parseListOptions({
        q: ['a', 'b'],
        status: 'lost',
        sort: 'secret_column',
        dir: 'sideways',
      }),
    ).toEqual({ search: '', view: 'open', sort: undefined, dir: 'desc' })
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
