import { InvoiceForm } from '@/components/invoices/invoice-form'
import { InvoiceView } from '@/components/invoices/invoice-view'
import { listClients } from '@/lib/clients/queries'
import {
  getInvoice,
  listInvoiceEvents,
  listPayments,
} from '@/lib/invoices/queries'
import { formatAmount, formatQuantity, formatRate } from '@/lib/money'
import { getBusinessProfile } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Invoice' }

// Blank instead of "0", so untouched rates stay empty in the editor.
const rateInput = (rate: number) => (rate ? formatRate(rate) : '')

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [{ id }, organizationId] = await Promise.all([
    params,
    requireOrganizationId(),
  ])
  // Another organization's invoice is as missing as one that never existed.
  const invoice = isUuid(id) ? await getInvoice(organizationId, id) : undefined
  if (!invoice) notFound()

  if (invoice.status !== 'draft') {
    const [profile, events, payments] = await Promise.all([
      getBusinessProfile(organizationId),
      listInvoiceEvents(organizationId, invoice.id),
      listPayments(organizationId, invoice.id),
    ])
    return (
      <InvoiceView
        invoice={invoice}
        events={events}
        payments={payments}
        timeZone={profile?.timeZone ?? 'UTC'}
      />
    )
  }

  const clients = await listClients(organizationId)
  return (
    <div className="max-w-4xl">
      <InvoiceForm
        id={invoice.id}
        clients={clients.map(({ id, name }) => ({ code: id, name }))}
        invoice={{
          clientId: invoice.clientId,
          currency: invoice.currency,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          notes: invoice.notes ?? '',
          terms: invoice.terms ?? '',
          lines: invoice.lines.map((line) => ({
            description: line.description,
            quantity: formatQuantity(line.quantity),
            unitPrice: formatAmount(line.unitPrice, invoice.currency),
            taxRate: rateInput(line.taxRate),
            discountRate: rateInput(line.discountRate),
          })),
        }}
      />
    </div>
  )
}
