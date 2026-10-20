import { describe, expect, it } from 'vitest'

import {
  invoiceSchema,
  issuesByPath,
  MAX_LINES,
  previewTotals,
  type InvoiceInput,
  type LineInput,
} from './schema'

const clientId = '0199f6a4-7b1c-7000-8000-000000000000'

const line = (overrides: Partial<LineInput> = {}): LineInput => ({
  description: 'Design',
  quantity: '1.5',
  unitPrice: '100',
  taxRate: '19',
  discountRate: '',
  ...overrides,
})

const input = (overrides: Partial<InvoiceInput> = {}): InvoiceInput => ({
  clientId,
  currency: 'EUR',
  issueDate: '2026-10-01',
  dueDate: '2026-10-31',
  notes: '',
  terms: ' Net 30 ',
  lines: [line()],
  ...overrides,
})

const errors = (overrides: Partial<InvoiceInput>) => {
  const result = invoiceSchema.safeParse(input(overrides))
  return result.success ? {} : issuesByPath(result.error)
}

describe('invoiceSchema', () => {
  it('parses typed values into stored ones', () => {
    expect(invoiceSchema.parse(input())).toEqual({
      clientId,
      currency: 'EUR',
      issueDate: '2026-10-01',
      dueDate: '2026-10-31',
      notes: null,
      terms: 'Net 30',
      lines: [
        {
          description: 'Design',
          quantity: 1500,
          unitPrice: 10000,
          taxRate: 1900,
          discountRate: 0,
        },
      ],
    })
  })

  it('converts prices with the currency’s decimals', () => {
    const parsed = invoiceSchema.parse(
      input({ currency: 'JPY', lines: [line({ unitPrice: '1200' })] }),
    )
    expect(parsed.lines[0].unitPrice).toBe(1200)
  })

  it('flags prices with too many decimals for the currency', () => {
    expect(
      errors({ currency: 'JPY', lines: [line({ unitPrice: '12.5' })] }),
    ).toEqual({ 'lines.0.unitPrice': 'Use whole amounts for JPY' })
    expect(errors({ lines: [line({ unitPrice: '12.505' })] })).toEqual({
      'lines.0.unitPrice': 'Use up to 2 decimals for EUR',
    })
  })

  it('flags each bad field by its path', () => {
    expect(
      errors({
        clientId: '',
        issueDate: '',
        lines: [
          line(),
          line({
            description: ' ',
            quantity: 'two',
            unitPrice: '-5',
            taxRate: '101',
            discountRate: 'x',
          }),
        ],
      }),
    ).toEqual({
      clientId: 'Pick a client',
      issueDate: 'Pick a date',
      'lines.1.description': 'Describe the item',
      'lines.1.quantity': 'Enter a quantity, e.g. 1 or 1.5',
      'lines.1.unitPrice': 'Enter a price, e.g. 12.50',
      'lines.1.taxRate': 'Enter a percentage from 0 to 100',
      'lines.1.discountRate': 'Enter a percentage from 0 to 100',
    })
  })

  it('rejects unknown currencies', () => {
    expect(errors({ currency: 'XYZ' })).toEqual({
      currency: 'Pick a currency',
    })
  })

  it('needs the due date on or after the issue date', () => {
    expect(errors({ dueDate: '2026-09-30' })).toEqual({
      dueDate: 'Due date can’t be before the issue date',
    })
    expect(errors({ dueDate: '2026-10-01' })).toEqual({})
  })

  it('needs between one and the maximum number of lines', () => {
    expect(errors({ lines: [] })).toEqual({ lines: 'Add at least one line' })
    expect(
      errors({ lines: Array.from({ length: MAX_LINES + 1 }, () => line()) }),
    ).toEqual({ lines: `Keep it to ${MAX_LINES} lines` })
  })

  it('caps quantities', () => {
    expect(errors({ lines: [line({ quantity: '1000000' })] })).toEqual({})
    expect(errors({ lines: [line({ quantity: '1000000.001' })] })).toEqual({
      'lines.0.quantity': 'Keep it to 1,000,000 or less',
    })
  })

  it('flags totals too large to add up', () => {
    expect(
      errors({
        lines: [line({ quantity: '1000000', unitPrice: '9999999999' })],
      }),
    ).toEqual({ lines: 'These amounts are too large to add up' })
  })
})

describe('previewTotals', () => {
  it('adds up what has been typed so far', () => {
    const totals = previewTotals('EUR', [
      line({ quantity: '2', unitPrice: '100', discountRate: '10' }),
      line({ quantity: '1', unitPrice: '', taxRate: '' }),
    ])
    expect(totals?.lines.map((amounts) => amounts.net)).toEqual([18000, 0])
    expect(totals).toMatchObject({ net: 18000, tax: 3420, total: 21420 })
  })

  it('counts invalid input as zero', () => {
    const totals = previewTotals('EUR', [
      line({ quantity: 'two', unitPrice: '12.505', taxRate: '150' }),
    ])
    expect(totals).toMatchObject({ total: 0, taxes: [{ rate: 0 }] })
  })

  it('gives up on amounts too large to add up', () => {
    expect(
      previewTotals('EUR', [
        line({ quantity: '1000000', unitPrice: '9999999999' }),
      ]),
    ).toBeNull()
  })
})
