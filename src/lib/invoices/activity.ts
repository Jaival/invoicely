import type { InvoiceEventData, InvoiceEventType } from '@/db/schema'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

// An entry in an invoice's activity log, in words. Amounts are in the
// invoice's currency.
export function describeEvent(
  {
    type,
    data,
  }: {
    type: InvoiceEventType
    data: InvoiceEventData | null
  },
  currency: string,
) {
  const payment = () =>
    data?.amount === undefined
      ? 'Payment'
      : `Payment of ${formatMoney(data.amount, currency)}`
  const received = data?.paidOn ? ` received ${formatDate(data.paidOn)}` : ''
  switch (type) {
    case 'sent':
      return 'Sent'
    case 'emailed':
      return data?.to ? `Emailed to ${data.to}` : 'Emailed to the client'
    case 'paid':
      return data?.paidOn
        ? `Marked paid, received ${formatDate(data.paidOn)}`
        : 'Marked paid'
    case 'unpaid':
      return 'Marked unpaid'
    case 'payment_recorded':
      return `${payment()}${received}`
    case 'payment_removed':
      return `${payment()}${received} removed`
    case 'voided':
      return 'Voided'
  }
}
