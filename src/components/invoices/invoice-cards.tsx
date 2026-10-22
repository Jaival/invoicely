import { InvoiceRowMenu } from '@/components/invoices/invoice-row-menu'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import type { listInvoices } from '@/lib/invoices/queries'
import { displayStatus, dueLabel } from '@/lib/invoices/status'
import { formatMoney } from '@/lib/money'
import { cn } from 'cn'
import Link from 'next/link'

type InvoiceCardsProps = {
  invoices: Awaited<ReturnType<typeof listInvoices>>
  // The business's, which decides what's overdue.
  today: string
  className?: string
}

// The invoice list on a phone, where a table's columns don't fit: two lines
// per invoice, who and how much, then which and when.
export function InvoiceCards({
  invoices,
  today,
  className,
}: InvoiceCardsProps) {
  return (
    <ul aria-label="Invoices" className={cn('divide-y panel', className)}>
      {invoices.map((invoice) => {
        const status = displayStatus(invoice, today)
        const due = dueLabel(invoice, today)
        return (
          <li key={invoice.id} className="relative flex items-center gap-2 p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 font-medium">
                {/* Stretched over the card, so all of it opens the invoice. */}
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="truncate after:absolute after:inset-0"
                >
                  {invoice.clientName}
                </Link>
                <span className="font-figures tabular-nums">
                  {formatMoney(invoice.total, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">
                  <span className="font-figures">
                    {invoice.number ?? 'Draft'}
                  </span>
                  {due && (
                    <>
                      {' · '}
                      <span
                        className={cn(
                          status === 'overdue' &&
                            'font-medium text-destructive',
                        )}
                      >
                        {due}
                      </span>
                    </>
                  )}
                </span>
                <InvoiceStatusBadge status={status} />
              </div>
            </div>
            {/* Above the stretched link, so it opens the menu instead. */}
            <div className="relative">
              <InvoiceRowMenu invoice={invoice} status={status} today={today} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
