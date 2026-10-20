import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/dates'
import { listInvoices } from '@/lib/invoices/queries'
import { formatMoney } from '@/lib/money'
import { requireOrganizationId } from '@/lib/session'
import { FileText, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const organizationId = await requireOrganizationId()
  const invoices = await listInvoices(organizationId)

  const heading = (
    <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
  )
  const newInvoice = (
    <Button asChild>
      <Link href="/invoices/new">
        <Plus data-icon="inline-start" />
        New invoice
      </Link>
    </Button>
  )

  if (!invoices.length) {
    return (
      <>
        {heading}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create a draft, add what you did, and send it when it’s ready.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newInvoice}</EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {heading}
        {newInvoice}
      </div>
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="hover:underline"
                  >
                    {invoice.number ?? 'Draft'}
                  </Link>
                </TableCell>
                <TableCell>{invoice.clientName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(invoice.issueDate)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(invoice.dueDate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(invoice.total, invoice.currency)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
