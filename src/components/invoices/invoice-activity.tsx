import { formatDateTime } from '@/lib/dates'
import { describeEvent } from '@/lib/invoices/activity'
import type { listInvoiceEvents } from '@/lib/invoices/queries'

type InvoiceActivityProps = {
  events: Awaited<ReturnType<typeof listInvoiceEvents>>
  // The business's, so times read as its clock did.
  timeZone: string
}

// What has happened to the invoice since it was sent, oldest first.
export function InvoiceActivity({ events, timeZone }: InvoiceActivityProps) {
  return (
    <section aria-labelledby="invoice-activity" className="text-sm">
      <h2 id="invoice-activity" className="mb-3 text-muted-foreground">
        Activity
      </h2>
      <ol className="flex flex-col gap-2 border-l pl-4 brutal:border-l-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-wrap justify-between gap-x-4 gap-y-0.5"
          >
            <span>{describeEvent(event)}</span>
            <time
              dateTime={event.createdAt.toISOString()}
              className="font-figures text-muted-foreground tabular-nums"
            >
              {formatDateTime(event.createdAt, timeZone)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}
