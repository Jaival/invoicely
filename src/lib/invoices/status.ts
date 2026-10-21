import type { InvoiceStatus } from '@/db/schema'
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

// Why a payment date can't be recorded, if it can't. Dates are YYYY-MM-DD,
// and today is the business's.
export function paymentDateError(paidOn: string, today: string) {
  if (!z.iso.date().safeParse(paidOn).success) {
    return 'Pick the day the payment arrived'
  }
  if (paidOn > today) return 'The payment date can’t be in the future'
  return undefined
}
