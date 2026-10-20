import { describe, expect, it } from 'vitest'

import {
  currencyDigits,
  formatAmount,
  formatDecimal,
  formatMoney,
  formatQuantity,
  formatRate,
  invoiceTotals,
  lineAmounts,
  parseAmount,
  parseDecimal,
  parseQuantity,
  parseRate,
  type Line,
} from '@/lib/money'

const line = (overrides: Partial<Line>): Line => ({
  quantity: 1000,
  unitPrice: 0,
  taxRate: 0,
  discountRate: 0,
  ...overrides,
})

describe('currencyDigits', () => {
  it('follows the currency', () => {
    expect(currencyDigits('EUR')).toBe(2)
    expect(currencyDigits('JPY')).toBe(0)
    expect(currencyDigits('KWD')).toBe(3)
  })
})

describe('parseDecimal', () => {
  it('scales plain decimals to integers', () => {
    expect(parseDecimal('12.5', 3)).toBe(12500)
    expect(parseDecimal(' 7 ', 2)).toBe(700)
    expect(parseDecimal('.25', 2)).toBe(25)
    expect(parseDecimal('3.', 2)).toBe(300)
    expect(parseDecimal('007', 0)).toBe(7)
  })

  it('rejects anything else', () => {
    for (const input of ['', '.', 'abc', '-1', '1,000', '1e3', '1.2.3']) {
      expect(parseDecimal(input, 2)).toBeNull()
    }
  })

  it('rejects more decimals than the scale', () => {
    expect(parseDecimal('1.005', 2)).toBeNull()
    expect(parseDecimal('1.5', 0)).toBeNull()
  })

  it('rejects values past the safe integer range', () => {
    expect(parseDecimal('90071992547409.92', 2)).toBeNull()
  })
})

describe('formatDecimal', () => {
  it('is the inverse of parseDecimal', () => {
    expect(formatDecimal(12500, 3)).toBe('12.5')
    expect(formatDecimal(5, 2)).toBe('0.05')
    expect(formatDecimal(1000, 3)).toBe('1')
    expect(formatDecimal(42, 0)).toBe('42')
  })

  it('keeps trailing zeros down to minDigits', () => {
    expect(formatDecimal(1250, 2, 2)).toBe('12.50')
    expect(formatDecimal(1200, 2, 2)).toBe('12.00')
  })

  it('keeps the sign', () => {
    expect(formatDecimal(-5, 2, 2)).toBe('-0.05')
  })
})

describe('parsers and formatters', () => {
  it('parse amounts in the currency minor unit', () => {
    expect(parseAmount('1234.5', 'EUR')).toBe(123450)
    expect(parseAmount('1234', 'JPY')).toBe(1234)
    expect(parseAmount('12.5', 'JPY')).toBeNull()
  })

  it('parse quantities in thousandths', () => {
    expect(parseQuantity('1.5')).toBe(1500)
    expect(parseQuantity('0.3333')).toBeNull()
  })

  it('parse rates from 0 to 100% in basis points', () => {
    expect(parseRate('19')).toBe(1900)
    expect(parseRate('7.25')).toBe(725)
    expect(parseRate('100')).toBe(10_000)
    expect(parseRate('100.01')).toBeNull()
    expect(parseRate('x')).toBeNull()
  })

  it('format values back for form fields', () => {
    expect(formatAmount(123450, 'EUR')).toBe('1234.50')
    expect(formatAmount(1234, 'JPY')).toBe('1234')
    expect(formatQuantity(1500)).toBe('1.5')
    expect(formatRate(725)).toBe('7.25')
  })
})

describe('formatMoney', () => {
  it('formats for display', () => {
    expect(formatMoney(123450, 'EUR')).toBe('€1,234.50')
    expect(formatMoney(1234, 'JPY')).toBe('¥1,234')
    expect(formatMoney(123450, 'EUR', 'de-DE')).toBe('1.234,50 €')
  })

  it('stays exact beyond float precision', () => {
    expect(formatMoney(9_007_199_254_740_991, 'USD')).toBe(
      '$90,071,992,547,409.91',
    )
  })
})

describe('lineAmounts', () => {
  it('applies discount before tax', () => {
    // 1.5 h at €80, 10% off, 19% VAT
    expect(
      lineAmounts({
        quantity: 1500,
        unitPrice: 8000,
        discountRate: 1000,
        taxRate: 1900,
      }),
    ).toEqual({
      amount: 12000,
      discount: 1200,
      net: 10800,
      tax: 2052,
      total: 12852,
    })
  })

  it('rounds each step half away from zero', () => {
    // 0.333 × 300 = 99.9 → 100
    expect(lineAmounts(line({ quantity: 333, unitPrice: 300 })).amount).toBe(
      100,
    )
    // 10% of 5 = 0.5 → 1
    expect(lineAmounts(line({ unitPrice: 5, taxRate: 1000 })).tax).toBe(1)
    // 10% of 4 = 0.4 → 0
    expect(lineAmounts(line({ unitPrice: 4, taxRate: 1000 })).tax).toBe(0)
    // 15% of 3 = 0.45 → 0, not 1 (no double rounding)
    expect(lineAmounts(line({ unitPrice: 3, taxRate: 1500 })).tax).toBe(0)
  })

  it('rounds negative amounts away from zero too', () => {
    expect(lineAmounts(line({ unitPrice: -5, taxRate: 1000 })).tax).toBe(-1)
    expect(lineAmounts(line({ unitPrice: -4, taxRate: 1000 })).tax).toBe(0)
  })

  it('handles a full discount', () => {
    expect(
      lineAmounts(
        line({ unitPrice: 999, discountRate: 10_000, taxRate: 2000 }),
      ),
    ).toEqual({ amount: 999, discount: 999, net: 0, tax: 0, total: 0 })
  })

  it('stays exact when the intermediate product exceeds float precision', () => {
    // 999,999.999 × 9,000,000,000 overflows 2^53 before dividing.
    expect(
      lineAmounts(line({ quantity: 999_999_999, unitPrice: 9_000_000_000 }))
        .amount,
    ).toBe(8_999_999_991_000_000)
  })

  it('throws when the result is too large', () => {
    expect(() =>
      lineAmounts(
        line({ quantity: 10_000_000_000, unitPrice: 10_000_000_000 }),
      ),
    ).toThrow(RangeError)
  })

  it('throws on non-integer input', () => {
    expect(() => lineAmounts(line({ unitPrice: 1.5 }))).toThrow(RangeError)
  })
})

describe('invoiceTotals', () => {
  it('is all zeros without lines', () => {
    expect(invoiceTotals([])).toEqual({
      subtotal: 0,
      discount: 0,
      net: 0,
      tax: 0,
      total: 0,
      taxes: [],
    })
  })

  it('sums the rounded lines and groups tax by rate', () => {
    const totals = invoiceTotals([
      line({ quantity: 2000, unitPrice: 5000, taxRate: 1900 }),
      line({ unitPrice: 2000, discountRate: 2500, taxRate: 700 }),
      line({ unitPrice: 333, taxRate: 1900 }),
      line({ unitPrice: 100 }),
    ])

    expect(totals).toEqual({
      subtotal: 12433,
      discount: 500,
      net: 11933,
      tax: 2068,
      total: 14001,
      taxes: [
        { rate: 1900, net: 10333, tax: 1963 },
        { rate: 700, net: 1500, tax: 105 },
        { rate: 0, net: 100, tax: 0 },
      ],
    })
  })

  it('totals equal the sum of the printed lines', () => {
    // Three lines of 10% on €0.05: per-line rounding gives 1 cent each.
    const lines = Array.from({ length: 3 }, () =>
      line({ unitPrice: 5, taxRate: 1000 }),
    )
    const totals = invoiceTotals(lines)
    const lineTotals = lines.map((item) => lineAmounts(item).total)

    expect(totals.tax).toBe(3)
    expect(totals.total).toBe(lineTotals.reduce((sum, total) => sum + total))
  })

  it('throws when the sum is too large', () => {
    const big = line({ quantity: 1000, unitPrice: 5_000_000_000_000_000 })
    expect(() => invoiceTotals([big, big])).toThrow(RangeError)
  })
})
