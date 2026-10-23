import type { InvoiceStatus } from '@/db/schema'
import { daysBetween, formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import * as z from 'zod'

// The status an invoice shows: its stored one, or, for a sent invoice,
// overdue once its due date has passed (due today is not yet overdue), and
// partially paid while some of it is paid but it isn't late. Late matters
// more than part paid.
export type DisplayStatus = InvoiceStatus | 'overdue' | 'partially_paid'

// The statuses of invoices still waiting on (some of) their money.
export const owedStatuses = ['sent', 'partially_paid', 'overdue'] as const

export const isOwed = (status: DisplayStatus) =>
  (owedStatuses as readonly DisplayStatus[]).includes(status)

export function displayStatus(
  invoice: { status: InvoiceStatus; dueDate: string; amountPaid: number },
  today: string,
): DisplayStatus {
  if (invoice.status !== 'sent') return invoice.status
  if (invoice.dueDate < today) return 'overdue'
  return invoice.amountPaid > 0 ? 'partially_paid' : 'sent'
}

// Past this, a due date reads better as a date than as a count of days.
const RELATIVE_DAYS = 30

const days = (n: number) => (n === 1 ? '1 day' : `${n} days`)

// When an invoice is due, or was paid, as the list shows it: "12 days
// overdue", "Due in 5 days", "Paid Oct 3", and what's left of it once part
// is paid: "Due in 5 days · €120.00 left". Void invoices aren't owed, so
// they have none. today is the business's.
export function dueLabel(
  invoice: {
    status: InvoiceStatus
    dueDate: string
    paidOn: string | null
    amountPaid: number
    total: number
    currency: string
  },
  today: string,
) {
  const status = displayStatus(invoice, today)
  if (status === 'void') return undefined
  if (status === 'paid' && invoice.paidOn) {
    return `Paid ${formatShortDate(invoice.paidOn, today)}`
  }
  const due =
    dueDay(status, daysBetween(today, invoice.dueDate)) ??
    `Due ${formatShortDate(invoice.dueDate, today)}`
  if (!invoice.amountPaid) return due
  const left = formatMoney(invoice.total - invoice.amountPaid, invoice.currency)
  return `${due} · ${left} left`
}

// The due date as a count of days, while it's close enough to read as one.
function dueDay(status: DisplayStatus, until: number) {
  if (status === 'overdue') return `${days(-until)} overdue`
  if (!isOwed(status) || until > RELATIVE_DAYS) return undefined
  if (until === 0) return 'Due today'
  if (until === 1) return 'Due tomorrow'
  return `Due in ${days(until)}`
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
