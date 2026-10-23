'use client'

import {
  addPayment,
  removeDraft,
  type InvoiceFormState,
} from '@/app/(app)/invoices/actions'
import { SelectField, TextField } from '@/components/form-fields'
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
import { Button } from '@/components/ui/button'
import { paymentMethodLabels } from '@/lib/invoices/payments'
import { formatAmount, formatMoney } from '@/lib/money'
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

const methodOptions = Object.entries(paymentMethodLabels).map(
  ([code, name]) => ({ code, name }),
)

export function RecordPaymentDialog({
  id,
  today,
  currency,
  balance,
  open,
  onOpenChange,
}: DialogProps & {
  // The business's today, the default payment date.
  today: string
  currency: string
  // What's left to pay, the default amount.
  balance: number
}) {
  const [state, setState] = useState<InvoiceFormState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()
  const errors = state.fieldErrors ?? {}

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '')
    startTransition(async () => {
      const result = await addPayment(id, {
        amount: field('amount'),
        receivedOn: field('receivedOn'),
        method: field('method'),
        reference: field('reference'),
      })
      setState(result)
      if (result.status === 'success') {
        onOpenChange(false)
        toast.success(result.paid ? 'Paid in full' : 'Payment recorded')
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
        {/* Fields start from their defaults each time it opens. */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Record a payment</AlertDialogTitle>
            <AlertDialogDescription>
              {formatMoney(balance, currency)} is left to pay. Record part of it
              if that’s what arrived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="amount"
              label={`Amount (${currency})`}
              inputMode="decimal"
              defaultValue={formatAmount(balance, currency)}
              error={errors.amount}
            />
            <TextField
              name="receivedOn"
              label="Payment date"
              type="date"
              max={today}
              defaultValue={today}
              error={errors.receivedOn}
            />
          </div>
          <SelectField
            name="method"
            label="Paid by"
            placeholder="Pick a method"
            options={methodOptions}
            defaultValue="bank_transfer"
            error={errors.method}
          />
          <TextField
            name="reference"
            label="Reference (optional)"
            description="Only you see this, e.g. the bank reference."
            error={errors.reference}
          />
          {state.status === 'error' && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Record payment
            </Button>
          </AlertDialogFooter>
        </form>
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
