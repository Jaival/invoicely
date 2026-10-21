import { CopyLinkButton } from '@/components/invoices/copy-link-button'
import { InvoiceActions } from '@/components/invoices/invoice-actions'
import { InvoiceActivity } from '@/components/invoices/invoice-activity'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import { InvoiceTotalsList } from '@/components/invoices/invoice-totals'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PartyDetails } from '@/db/schema'
import { env } from '@/env/client'
import { formatDate, today } from '@/lib/dates'
import type { getInvoice, listInvoiceEvents } from '@/lib/invoices/queries'
import { partyLines } from '@/lib/invoices/party'
import { displayStatus, type DisplayStatus } from '@/lib/invoices/status'
import {
  formatMoney,
  formatQuantity,
  formatRate,
  invoiceTotals,
  lineAmounts,
} from '@/lib/money'
import { Download } from 'lucide-react'
import Link from 'next/link'

type InvoiceViewProps = {
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoice>>>
  // The business's, which decides when it's overdue.
  timeZone: string
}

const descriptions: Partial<Record<DisplayStatus, string>> = {
  sent: 'Awaiting payment.',
  overdue: 'Past its due date and still unpaid.',
  paid: 'Paid in full.',
  void: 'Voided: no longer owed.',
}

// A sent invoice as it was sent, and what has happened to it since.
// Read-only; only its status changes.
export function InvoiceView({
  invoice,
  events,
  timeZone,
}: InvoiceViewProps & {
  events: Awaited<ReturnType<typeof listInvoiceEvents>>
}) {
  const businessToday = today(timeZone)
  const status = displayStatus(invoice, businessToday)

  return (
    <Card className="max-w-4xl">
      {/* The actions wrap below the title where there's no room beside it. */}
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-3 text-xl">
            <h1>{invoice.number}</h1>
            <InvoiceStatusBadge status={status} />
          </CardTitle>
          <CardDescription>{descriptions[status]}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.publicToken && (
            <CopyLinkButton
              url={
                new URL(`/i/${invoice.publicToken}`, env.NEXT_PUBLIC_APP_URL)
                  .href
              }
            />
          )}
          <Button variant="outline" asChild>
            {/* A plain link: the route answers with a file, not a page. */}
            <a href={`/invoices/${invoice.id}/pdf`} download>
              <Download />
              Download PDF
            </a>
          </Button>
          <InvoiceActions
            id={invoice.id}
            status={status}
            today={businessToday}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <InvoiceDocument invoice={invoice} timeZone={timeZone} />
        {events.length > 0 && (
          <>
            <Separator />
            <InvoiceActivity events={events} timeZone={timeZone} />
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// The invoice itself, as the client sees it: parties, dates, lines, totals
// and notes. Shared by the signed-in view and the public link.
export function InvoiceDocument({ invoice, timeZone }: InvoiceViewProps) {
  const money = (minor: number) => formatMoney(minor, invoice.currency)
  const dates: [string, string][] = [
    ['Issued', formatDate(invoice.issueDate)],
    ['Due', formatDate(invoice.dueDate)],
  ]
  if (invoice.paidOn) dates.push(['Paid', formatDate(invoice.paidOn)])
  if (invoice.voidedAt) {
    dates.push(['Voided', formatDate(today(timeZone, invoice.voidedAt))])
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {invoice.businessDetails && (
          <Party heading="From" details={invoice.businessDetails} />
        )}
        {invoice.clientDetails && (
          <Party heading="Bill to" details={invoice.clientDetails} />
        )}
        <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 text-sm">
          {dates.map(([label, value]) => (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="whitespace-normal">
                  {line.description}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(line.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.taxRate ? `${formatRate(line.taxRate)}%` : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.discountRate
                    ? `${formatRate(line.discountRate)}%`
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(lineAmounts(line).net)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <InvoiceTotalsList
        totals={invoiceTotals(invoice.lines)}
        currency={invoice.currency}
      />
      {(invoice.notes || invoice.terms) && (
        <>
          <Separator />
          <div className="grid gap-6 text-sm sm:grid-cols-2">
            {invoice.notes && <Note heading="Notes" text={invoice.notes} />}
            {invoice.terms && <Note heading="Terms" text={invoice.terms} />}
          </div>
        </>
      )}
    </div>
  )
}

function Party({
  heading,
  details,
}: {
  heading: string
  details: PartyDetails
}) {
  const lines = partyLines(details)

  return (
    <section aria-label={heading} className="text-sm">
      <h2 className="mb-1 text-muted-foreground">{heading}</h2>
      <p className="font-medium">{details.name}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  )
}

function Note({ heading, text }: { heading: string; text: string }) {
  return (
    <section>
      <h2 className="mb-1 text-muted-foreground">{heading}</h2>
      <p className="whitespace-pre-line">{text}</p>
    </section>
  )
}
