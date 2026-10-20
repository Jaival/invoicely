import { InvoiceForm } from '@/components/invoices/invoice-form'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { listClients } from '@/lib/clients/queries'
import { addDays, today } from '@/lib/dates'
import { getBusinessProfile } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { Plus, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'New invoice' }

// Days until a new invoice is due.
const PAYMENT_TERM_DAYS = 30

export default async function NewInvoicePage() {
  const organizationId = await requireOrganizationId()
  const [clients, profile] = await Promise.all([
    listClients(organizationId),
    getBusinessProfile(organizationId),
  ])

  if (!clients.length) {
    return (
      <Empty className="max-w-4xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>Add a client first</EmptyTitle>
          <EmptyDescription>
            Every invoice is addressed to a client. Add one, then come back to
            invoice them.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/clients/new">
              <Plus data-icon="inline-start" />
              Add client
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const issueDate = today()
  return (
    <div className="max-w-4xl">
      <InvoiceForm
        clients={clients.map(({ id, name }) => ({ code: id, name }))}
        invoice={{
          // Preselected when there's only one to choose from.
          clientId: clients.length === 1 ? clients[0].id : '',
          currency: profile?.defaultCurrency ?? 'USD',
          issueDate,
          dueDate: addDays(issueDate, PAYMENT_TERM_DAYS),
          notes: '',
          terms: '',
          lines: [
            {
              description: '',
              quantity: '1',
              unitPrice: '',
              taxRate: '',
              discountRate: '',
            },
          ],
        }}
      />
    </div>
  )
}
