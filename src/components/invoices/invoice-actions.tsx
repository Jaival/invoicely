'use client'

import {
  markPaid,
  markUnpaid,
  markVoid,
  type InvoiceFormState,
} from '@/app/(app)/invoices/actions'
import { TextField } from '@/components/form-fields'
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
import { Loader2 } from 'lucide-react'
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

function MarkPaid({ id, today }: { id: string; today: string }) {
  const [open, setOpen] = useState(false)
  const [paidOn, setPaidOn] = useState(today)
  const [state, setState] = useState<InvoiceFormState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()

  function onConfirm(event: React.MouseEvent) {
    // Keep the dialog open until it's recorded, or to show what's wrong.
    event.preventDefault()
    startTransition(async () => {
      const result = await markPaid(id, paidOn)
      setState(result)
      if (result.status === 'success') {
        setOpen(false)
        toast.success('Marked as paid')
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setState({ status: 'idle' })
      }}
    >
      <AlertDialogTrigger asChild>
        <Button>Mark as paid</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this invoice as paid?</AlertDialogTitle>
          <AlertDialogDescription>
            Record the day the full amount arrived.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <TextField
          name="paidOn"
          label="Payment date"
          type="date"
          max={today}
          value={paidOn}
          onChange={(event) => setPaidOn(event.target.value)}
          error={state.fieldErrors?.paidOn}
        />
        {state.status === 'error' && !state.fieldErrors?.paidOn && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending && <Loader2 className="animate-spin" />}
            Mark as paid
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
