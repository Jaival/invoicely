'use client'

import { markVoid } from '@/app/(app)/invoices/actions'
import { RecordPaymentDialog } from '@/components/invoices/invoice-dialogs'
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
import { isOwed, type DisplayStatus } from '@/lib/invoices/status'
import { Copy, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

type InvoiceActionsProps = {
  id: string
  status: DisplayStatus
  // The business's today, the default payment date.
  today: string
  currency: string
  total: number
  amountPaid: number
}

// What can happen next to a sent invoice: one awaiting payment gets paid,
// or voided while nothing is paid. Paid and void invoices have nothing
// next; a payment is taken back from the invoice's payments instead.
export function InvoiceActions({
  id,
  status,
  amountPaid,
  total,
  ...payment
}: InvoiceActionsProps) {
  if (!isOwed(status)) return null
  return (
    <div className="flex flex-wrap gap-2">
      <RecordPayment id={id} balance={total - amountPaid} {...payment} />
      {amountPaid === 0 && <VoidInvoice id={id} />}
    </div>
  )
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

function RecordPayment({
  id,
  ...payment
}: {
  id: string
  today: string
  currency: string
  balance: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Record payment</Button>
      <RecordPaymentDialog
        id={id}
        open={open}
        onOpenChange={setOpen}
        {...payment}
      />
    </>
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
