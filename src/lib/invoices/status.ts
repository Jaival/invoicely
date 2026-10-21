import type { InvoiceStatus } from '@/db/schema'
import { daysBetween, formatShortDate } from '@/lib/dates'
import * as z from 'zod'

// The status an invoice shows: its stored one, or overdue for a sent
// invoice whose due date has passed. Due today is not yet overdue.
export type DisplayStatus = InvoiceStatus | 'overdue'

export function displayStatus(
  invoice: { status: InvoiceStatus; dueDate: string },
  today: string,
): DisplayStatus {
  return invoice.status === 'sent' && invoice.dueDate < today
    ? 'overdue'
    : invoice.status
}

// Past this, a due date reads better as a date than as a count of days.
const RELATIVE_DAYS = 30

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

// When an invoice is due, or was paid, as the list shows it: "12 days
// overdue", "Due in 5 days", "Paid Oct 3". Void invoices aren't owed, so
// they have none. today is the business's.
export function dueLabel(
  invoice: { status: InvoiceStatus; dueDate: string; paidOn: string | null },
  today: string,
) {
  const status = displayStatus(invoice, today)
  const until = daysBetween(today, invoice.dueDate)
  if (status === 'void') return undefined
  if (status === 'paid' && invoice.paidOn) {
    return `Paid ${formatShortDate(invoice.paidOn, today)}`
  }
  if (status === 'overdue') return `${days(-until)} overdue`
  if (status === 'sent' && until <= RELATIVE_DAYS) {
    if (until === 0) return 'Due today'
    if (until === 1) return 'Due tomorrow'
    return `Due in ${days(until)}`
  }
  return `Due ${formatShortDate(invoice.dueDate, today)}`
}

// Why a payment date can't be recorded, if it can't. Dates are YYYY-MM-DD,
// and today is the business's.
export function paymentDateError(paidOn: string, today: string) {
  if (!z.iso.date().safeParse(paidOn).success) {
    return 'Pick the day the payment arrived'
  }
  if (paidOn > today) return 'The payment date can’t be in the future'
  return undefined
}
