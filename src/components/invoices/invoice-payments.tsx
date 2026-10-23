'use client'

import { deletePayment } from '@/app/(app)/invoices/actions'
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
import { formatDate } from '@/lib/dates'
import { paymentMethodLabels } from '@/lib/invoices/payments'
import type { listPayments } from '@/lib/invoices/queries'
import { formatMoney } from '@/lib/money'
import { Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

type Payment = Awaited<ReturnType<typeof listPayments>>[number]

// The money received against an invoice, in the order it arrived. Only the
// business sees these; the client sees what's paid in the totals.
export function InvoicePayments({
  payments,
  currency,
}: {
  payments: Payment[]
  currency: string
}) {
  return (
    <section aria-labelledby="invoice-payments" className="text-sm">
      <h2 id="invoice-payments" className="mb-3 text-muted-foreground">
        Payments
      </h2>
      <ul className="flex flex-col gap-2">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
          >
            <span>
              <span className="font-figures">
                {formatDate(payment.receivedOn)}
              </span>
              {' · '}
              {paymentMethodLabels[payment.method]}
              {payment.reference && (
                <span className="text-muted-foreground">
                  {' · '}
                  {payment.reference}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-figures font-medium tabular-nums">
                {formatMoney(payment.amount, currency)}
              </span>
              <RemovePayment payment={payment} currency={currency} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RemovePayment({
  payment,
  currency,
}: {
  payment: Payment
  currency: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const amount = formatMoney(payment.amount, currency)

  function onConfirm(event: React.MouseEvent) {
    // Keep the dialog open until it's removed.
    event.preventDefault()
    startTransition(async () => {
      const result = await deletePayment(payment.id)
      setOpen(false)
      if (result.status === 'error') toast.error(result.message)
      else toast.success('Payment removed')
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove the ${amount} payment from ${formatDate(payment.receivedOn)}`}
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this payment?</AlertDialogTitle>
          <AlertDialogDescription>
            Use this for a payment recorded by mistake or one that bounced. The
            invoice will be awaiting {amount} again.
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
            Remove payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
