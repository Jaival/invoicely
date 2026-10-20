// Money is stored and computed as integers, so totals never pick up
// floating-point error: amounts in the currency's minor unit (cents),
// quantities in thousandths, and tax and discount rates in basis points
// (19% = 1900). Prices are before tax; tax is rounded per line, half away
// from zero, so every printed line adds up to the printed total.

export const QUANTITY_SCALE = 3
export const RATE_SCALE = 2

const QUANTITY_UNIT = 10n ** BigInt(QUANTITY_SCALE)
// 100% in basis points.
export const FULL_RATE = 10_000

export type Line = {
  quantity: number
  unitPrice: number
  taxRate: number
  discountRate: number
}

export type LineAmounts = {
  // quantity × unit price, before discount and tax
  amount: number
  discount: number
  net: number
  tax: number
  total: number
}

export type TaxGroup = { rate: number; net: number; tax: number }

export type InvoiceTotals = {
  subtotal: number
  discount: number
  net: number
  tax: number
  total: number
  // One entry per tax rate, highest first, for the "VAT 19%" lines.
  taxes: TaxGroup[]
}

// Digits after the decimal point: 2 for EUR, 0 for JPY, 3 for KWD.
export function currencyDigits(currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits!
}

// Parses user input like "12.5" into an integer with `scale` implied
// decimals (12500 for scale 3). Returns null for anything but a plain
// non-negative decimal, or one with more decimals than the scale allows.
export function parseDecimal(input: string, scale: number) {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(input.trim())
  if (!match) return null
  const [, whole, fraction = ''] = match
  if (!whole && !fraction) return null
  if (fraction.length > scale) return null
  const value = Number(whole + fraction.padEnd(scale, '0'))
  return Number.isSafeInteger(value) ? value : null
}

// The inverse of parseDecimal: 12500 at scale 3 is "12.5". Trailing zeros
// are dropped down to `minDigits`, so amounts can keep "12.50".
export function formatDecimal(value: number, scale: number, minDigits = 0) {
  const sign = value < 0 ? '-' : ''
  const digits = String(Math.abs(value)).padStart(scale + 1, '0')
  const whole = digits.slice(0, digits.length - scale)
  let fraction = digits.slice(digits.length - scale)
  while (fraction.length > minDigits && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1)
  }
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`
}

export const parseAmount = (input: string, currency: string) =>
  parseDecimal(input, currencyDigits(currency))

export const parseQuantity = (input: string) =>
  parseDecimal(input, QUANTITY_SCALE)

// A percentage from 0 to 100 with up to two decimals, in basis points.
export function parseRate(input: string) {
  const rate = parseDecimal(input, RATE_SCALE)
  return rate !== null && rate <= FULL_RATE ? rate : null
}

export const formatAmount = (minor: number, currency: string) => {
  const digits = currencyDigits(currency)
  return formatDecimal(minor, digits, digits)
}

export const formatQuantity = (quantity: number) =>
  formatDecimal(quantity, QUANTITY_SCALE)

export const formatRate = (rate: number) => formatDecimal(rate, RATE_SCALE)

// "€1,234.50". The amount goes to Intl as a decimal string, so it is never
// converted to a float.
export function formatMoney(minor: number, currency: string, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    formatAmount(minor, currency) as `${number}`,
  )
}

export function lineAmounts(line: Line): LineAmounts {
  const amount = toSafe(
    divideRounded(
      BigInt(line.quantity) * BigInt(line.unitPrice),
      QUANTITY_UNIT,
    ),
  )
  const discount = applyRate(amount, line.discountRate)
  const net = amount - discount
  const tax = applyRate(net, line.taxRate)
  return {
    amount,
    discount,
    net,
    tax,
    total: toSafe(BigInt(net) + BigInt(tax)),
  }
}

export function invoiceTotals(lines: Line[]): InvoiceTotals {
  let subtotal = 0n
  let discount = 0n
  let tax = 0n
  const taxes = new Map<number, TaxGroup>()

  for (const line of lines) {
    const amounts = lineAmounts(line)
    subtotal += BigInt(amounts.amount)
    discount += BigInt(amounts.discount)
    tax += BigInt(amounts.tax)

    const group = taxes.get(line.taxRate) ?? {
      rate: line.taxRate,
      net: 0,
      tax: 0,
    }
    group.net = toSafe(BigInt(group.net) + BigInt(amounts.net))
    group.tax = toSafe(BigInt(group.tax) + BigInt(amounts.tax))
    taxes.set(line.taxRate, group)
  }

  return {
    subtotal: toSafe(subtotal),
    discount: toSafe(discount),
    net: toSafe(subtotal - discount),
    tax: toSafe(tax),
    total: toSafe(subtotal - discount + tax),
    taxes: [...taxes.values()].sort((a, b) => b.rate - a.rate),
  }
}

function applyRate(amount: number, rate: number) {
  return toSafe(divideRounded(BigInt(amount) * BigInt(rate), BigInt(FULL_RATE)))
}

// a / b for a positive b, rounded half away from zero. BigInt keeps
// intermediate products exact however large they get.
function divideRounded(a: bigint, b: bigint) {
  const quotient = a / b
  const remainder = a % b
  const twice = 2n * (remainder < 0n ? -remainder : remainder)
  if (twice < b) return quotient
  return a < 0n ? quotient - 1n : quotient + 1n
}

function toSafe(value: bigint) {
  const number = Number(value)
  if (!Number.isSafeInteger(number)) {
    throw new RangeError('Amount is too large')
  }
  return number
}
