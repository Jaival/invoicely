import { describe, expect, it } from 'vitest'

import { listHref, parseListOptions, sortHref } from './list'

describe('parseListOptions', () => {
  it('defaults to every invoice, newest first', () => {
    expect(parseListOptions({})).toEqual({
      search: '',
      status: undefined,
      sort: undefined,
      dir: 'desc',
    })
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
      status: 'overdue',
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
    ).toEqual({ search: '', status: undefined, sort: undefined, dir: 'desc' })
  })

  it('caps the search length', () => {
    expect(parseListOptions({ q: 'x'.repeat(500) }).search).toHaveLength(100)
  })
})

describe('listHref', () => {
  const options = parseListOptions({})

  it('leaves out defaults', () => {
    expect(listHref(options)).toBe('/invoices')
  })

  it('keeps the other options when one changes', () => {
    const filtered = parseListOptions({
      q: 'acme & co',
      sort: 'due',
      dir: 'asc',
    })
    expect(listHref(filtered, { status: 'paid' })).toBe(
      '/invoices?q=acme+%26+co&status=paid&sort=due&dir=asc',
    )
    expect(listHref(filtered, { status: undefined, search: '' })).toBe(
      '/invoices?sort=due&dir=asc',
    )
  })
})

describe('sortHref', () => {
  it('sorts a new column in its most useful direction first', () => {
    const options = parseListOptions({})
    expect(sortHref(options, 'total')).toBe('/invoices?sort=total&dir=desc')
    expect(sortHref(options, 'client')).toBe('/invoices?sort=client&dir=asc')
    expect(sortHref(options, 'due')).toBe('/invoices?sort=due&dir=asc')
  })

  it('flips the direction of the current sort', () => {
    const options = parseListOptions({ sort: 'total', dir: 'desc' })
    expect(sortHref(options, 'total')).toBe('/invoices?sort=total&dir=asc')
    expect(
      sortHref(parseListOptions({ sort: 'total', dir: 'asc' }), 'total'),
    ).toBe('/invoices?sort=total&dir=desc')
  })
})
