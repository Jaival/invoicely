'use client'

import { markUnpaid, markVoid } from '@/app/(app)/invoices/actions'
import { MarkPaidDialog } from '@/components/invoices/invoice-dialogs'
import { useDuplicateInvoice } from '@/hooks/use-duplicate-invoice'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { DisplayStatus } from '@/lib/invoices/status'
import { Copy, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

type InvoiceActionsProps = {
  id: string
  status: DisplayStatus
  // The business's today, the default payment date.
  today: string
}

// What can happen next to a sent invoice: sent and overdue ones get paid or
// voided; a paid one can go back to unpaid. Void is final.
export function InvoiceActions({ id, status, today }: InvoiceActionsProps) {
  if (status === 'sent' || status === 'overdue') {
    return (
      <div className="flex flex-wrap gap-2">
        <MarkPaid id={id} today={today} />
        <VoidInvoice id={id} />
      </div>
    )
  }
  if (status === 'paid') return <MarkUnpaid id={id} />
  return null
}

// Starts a new draft from this invoice, e.g. for the next month's work.
export function DuplicateButton({ id }: { id: string }) {
  const [pending, duplicate] = useDuplicateInvoice(id)
  return (
    <Button variant="outline" disabled={pending} onClick={duplicate}>
      {pending ? <Loader2 className="animate-spin" /> : <Copy />}
      Duplicate
    </Button>
  )
}

function MarkPaid({ id, today }: { id: string; today: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Mark as paid</Button>
      <MarkPaidDialog
        id={id}
        today={today}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

function MarkUnpaid({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      const result = await markUnpaid(id)
      if (result.status === 'error') toast.error(result.message)
      else toast.success('Marked as unpaid')
    })
  }

  return (
    <Button variant="outline" disabled={pending} onClick={onClick}>
      {pending && <Loader2 className="animate-spin" />}
      Mark as unpaid
    </Button>
  )
}

function VoidInvoice({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function onConfirm(event: React.MouseEvent) {
    // Keep the dialog open until it's voided.
    event.preventDefault()
    startTransition(async () => {
      const result = await markVoid(id)
      setOpen(false)
      if (result.status === 'error') toast.error(result.message)
      else toast.success('Invoice voided')
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Void</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Use this for an invoice sent by mistake or replaced by another. It
            keeps its number but is no longer owed. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Loader2 className="animate-spin" />}
            Void invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
