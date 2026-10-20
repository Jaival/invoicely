import type { InvoiceValues } from '@/lib/invoices/queries'
import { currencyCodes } from '@/lib/locale-data'
import {
  currencyDigits,
  invoiceTotals,
  lineAmounts,
  parseAmount,
  parseDecimal,
  parseQuantity,
  parseRate,
} from '@/lib/money'
import { isUuid, optionalText } from '@/lib/validation'
import * as z from 'zod'

// Shared by the invoice editor and its server action. The editor submits
// what was typed, as strings; parsing turns them into stored values.

export const MAX_LINES = 100
// Keeps quantities (stored in thousandths) well inside a Postgres integer.
const MAX_QUANTITY = 1_000_000_000

// The most decimals any currency uses; checked per currency below.
const MAX_AMOUNT_DIGITS = 3

const quantity = z.string().transform((input, ctx) => {
  const value = parseQuantity(input)
  if (value === null) {
    ctx.addIssue('Enter a quantity, e.g. 1 or 1.5')
    return z.NEVER
  }
  if (value > MAX_QUANTITY) {
    ctx.addIssue('Keep it to 1,000,000 or less')
    return z.NEVER
  }
  return value
})

// Blank means 0%.
const rate = z.string().transform((input, ctx) => {
  if (!input.trim()) return 0
  const value = parseRate(input)
  if (value === null) {
    ctx.addIssue('Enter a percentage from 0 to 100')
    return z.NEVER
  }
  return value
})

export const lineSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Describe the item')
    .max(500, 'Keep it under 500 characters'),
  quantity,
  // Converted to minor units once the currency is known.
  unitPrice: z
    .string()
    .trim()
    .refine(
      (input) => parseDecimal(input, MAX_AMOUNT_DIGITS) !== null,
      'Enter a price, e.g. 12.50',
    ),
  taxRate: rate,
  discountRate: rate,
})

const date = z.iso.date('Pick a date')

export const invoiceSchema = z
  .object({
    clientId: z.string().refine(isUuid, 'Pick a client'),
    currency: z
      .string()
      .refine((value) => currencyCodes.has(value), 'Pick a currency'),
    issueDate: date,
    dueDate: date,
    notes: optionalText(2000),
    terms: optionalText(2000),
    lines: z
      .array(lineSchema)
      .min(1, 'Add at least one line')
      .max(MAX_LINES, `Keep it to ${MAX_LINES} lines`),
  })
  .transform((invoice, ctx): InvoiceValues => {
    let valid = true
    const fail = (path: (string | number)[], message: string) => {
      ctx.addIssue({ code: 'custom', path, message })
      valid = false
    }

    if (invoice.dueDate < invoice.issueDate) {
      fail(['dueDate'], 'Due date can’t be before the issue date')
    }

    const digits = currencyDigits(invoice.currency)
    const lines = invoice.lines.map((line, index) => {
      const unitPrice = parseAmount(line.unitPrice, invoice.currency)
      if (unitPrice === null) {
        fail(
          ['lines', index, 'unitPrice'],
          digits
            ? `Use up to ${digits} decimals for ${invoice.currency}`
            : `Use whole amounts for ${invoice.currency}`,
        )
      }
      return { ...line, unitPrice: unitPrice ?? 0 }
    })

    try {
      invoiceTotals(lines)
    } catch {
      fail(['lines'], 'These amounts are too large to add up')
    }

    return valid ? { ...invoice, lines } : z.NEVER
  })

export type InvoiceInput = z.input<typeof invoiceSchema>
export type LineInput = z.input<typeof lineSchema>

// Live totals while the user types: anything not (yet) valid counts as zero.
// Returns null when the amounts are too large to add up.
export function previewTotals(currency: string, lines: LineInput[]) {
  const rateOrZero = (input: string) => parseRate(input) ?? 0
  const parsed = lines.map((line) => ({
    quantity: parseQuantity(line.quantity) ?? 0,
    unitPrice: parseAmount(line.unitPrice, currency) ?? 0,
    taxRate: rateOrZero(line.taxRate),
    discountRate: rateOrZero(line.discountRate),
  }))
  try {
    return { lines: parsed.map(lineAmounts), ...invoiceTotals(parsed) }
  } catch {
    return null
  }
}

// "lines.0.quantity" → message, for showing errors next to their fields.
export function issuesByPath(error: z.ZodError) {
  const messages: Record<string, string> = {}
  for (const issue of error.issues) {
    messages[issue.path.join('.')] ??= issue.message
  }
  return messages
}
