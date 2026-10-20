import { InvoiceForm } from '@/components/invoices/invoice-form'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { listClients } from '@/lib/clients/queries'
import { getInvoice } from '@/lib/invoices/queries'
import { formatAmount, formatQuantity, formatRate } from '@/lib/money'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import type { Metadata } from 'next'
import Link from 'next/link'
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

  // Placeholder until sent invoices get their own page.
  if (invoice.status !== 'draft') {
    return (
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {invoice.number}
            <InvoiceStatusBadge status={invoice.status} />
          </CardTitle>
          <CardDescription>
            This invoice has been sent, so it can no longer be edited.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" asChild>
            <Link href="/invoices">Back to invoices</Link>
          </Button>
        </CardFooter>
      </Card>
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
