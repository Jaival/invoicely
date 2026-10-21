import type { InvoiceEventData, InvoiceEventType } from '@/db/schema'
import { formatDate } from '@/lib/dates'

// An entry in an invoice's activity log, in words.
export function describeEvent({
  type,
  data,
}: {
  type: InvoiceEventType
  data: InvoiceEventData | null
}) {
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
    case 'voided':
      return 'Voided'
  }
}
