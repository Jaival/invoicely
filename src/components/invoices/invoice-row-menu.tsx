'use client'

import { copyLink } from '@/components/invoices/copy-link-button'
import {
  DeleteDraftDialog,
  RecordPaymentDialog,
} from '@/components/invoices/invoice-dialogs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDuplicateInvoice } from '@/hooks/use-duplicate-invoice'
import { publicInvoiceUrl } from '@/lib/invoices/links'
import { isOwed, type DisplayStatus } from '@/lib/invoices/status'
import {
  Banknote,
  Copy,
  Download,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type InvoiceRowMenuProps = {
  invoice: {
    id: string
    number: string | null
    clientName: string
    publicToken: string | null
    currency: string
    total: number
    amountPaid: number
  }
  status: DisplayStatus
  // The business's today, the default payment date.
  today: string
}

// What can be done with an invoice from the list, depending on its status:
// drafts are edited or deleted, sent ones paid, shared or downloaded, and
// any of them duplicated.
export function InvoiceRowMenu({
  invoice: { id, number, clientName, publicToken, currency, total, amountPaid },
  status,
  today,
}: InvoiceRowMenuProps) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'paid' | 'delete'>()
  const [duplicating, duplicate] = useDuplicateInvoice(id)
  const draft = status === 'draft'
  const owed = isOwed(status)
  const href = `/invoices/${id}`

  return (
    <>
      {/* Not modal, so the menu closes cleanly when a dialog opens. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="brutal:border-2 brutal:border-foreground brutal:bg-card"
            aria-label={`Actions for ${number ?? `the draft for ${clientName}`}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={href}>
              {draft ? <Pencil /> : <Eye />}
              {draft ? 'Edit' : 'View'}
            </Link>
          </DropdownMenuItem>
          {owed && (
            <DropdownMenuItem onSelect={() => setDialog('paid')}>
              <Banknote />
              Record payment…
            </DropdownMenuItem>
          )}
          {publicToken && (
            <DropdownMenuItem
              onSelect={() => copyLink(publicInvoiceUrl(publicToken))}
            >
              <Link2 />
              Copy link
            </DropdownMenuItem>
          )}
          {!draft && (
            <DropdownMenuItem asChild>
              {/* A plain link: the route answers with a file, not a page. */}
              <a href={`${href}/pdf`} download>
                <Download />
                Download PDF
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={duplicating} onSelect={duplicate}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          {draft && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setDialog('delete')}
              >
                <Trash2 />
                Delete…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {owed && (
        <RecordPaymentDialog
          id={id}
          today={today}
          currency={currency}
          balance={total - amountPaid}
          open={dialog === 'paid'}
          onOpenChange={(open) => setDialog(open ? 'paid' : undefined)}
        />
      )}
      {draft && (
        <DeleteDraftDialog
          id={id}
          open={dialog === 'delete'}
          onOpenChange={(open) => setDialog(open ? 'delete' : undefined)}
          onDeleted={() => router.refresh()}
        />
      )}
    </>
  )
}
