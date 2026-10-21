'use client'

import {
  markPaid,
  removeDraft,
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
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

// Confirmations opened by whatever asks for them: a button on the invoice,
// or an item in a list row's menu.

type DialogProps = {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MarkPaidDialog({
  id,
  today,
  open,
  onOpenChange,
}: DialogProps & {
  // The business's today, the default payment date.
  today: string
}) {
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
        onOpenChange(false)
        toast.success('Marked as paid')
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        setState({ status: 'idle' })
      }}
    >
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

export function DeleteDraftDialog({
  id,
  open,
  onOpenChange,
  onDeleted,
}: DialogProps & { onDeleted: () => void }) {
  const [pending, startTransition] = useTransition()

  function onDelete(event: React.MouseEvent) {
    // Keep the dialog open until the delete finishes.
    event.preventDefault()
    startTransition(async () => {
      const result = await removeDraft(id)
      onOpenChange(false)
      if (result.status === 'error') {
        toast.error(result.message)
        return
      }
      toast.success('Draft deleted')
      onDeleted()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
          <AlertDialogDescription>
            It was never sent, so no invoice number is lost. It can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
