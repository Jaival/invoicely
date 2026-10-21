import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/dates'
import {
  listHref,
  listStatuses,
  parseListOptions,
  sortHref,
  type InvoiceListOptions,
  type SortKey,
} from '@/lib/invoices/list'
import { countInvoicesByStatus, listInvoices } from '@/lib/invoices/queries'
import { displayStatus, type DisplayStatus } from '@/lib/invoices/status'
import { formatMoney } from '@/lib/money'
import { businessToday } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { cn } from 'cn'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  Plus,
  Search,
} from 'lucide-react'
import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Invoices' }

const statusLabels: Record<DisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  void: 'Void',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, organizationId] = await Promise.all([
    searchParams,
    requireOrganizationId(),
  ])
  const options = parseListOptions(params)
  const today = await businessToday(organizationId)
  const [invoices, counts] = await Promise.all([
    listInvoices(organizationId, today, options),
    countInvoicesByStatus(organizationId, today, options.search),
  ])
  const matched = Object.values(counts).reduce((sum, n) => sum + n, 0)

  const heading = (
    <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
  )
  const newInvoice = (
    <Button asChild>
      <Link href="/invoices/new">
        <Plus data-icon="inline-start" />
        New invoice
      </Link>
    </Button>
  )

  if (!matched && !options.search) {
    return (
      <>
        {heading}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create a draft, add what you did, and send it when it’s ready.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newInvoice}</EmptyContent>
        </Empty>
      </>
    )
  }

  const sortable = (
    key: SortKey,
    label: string,
    { align, className }: { align?: 'right'; className?: string } = {},
  ) => (
    <SortableHead
      options={options}
      sortKey={key}
      align={align}
      className={className}
    >
      {label}
    </SortableHead>
  )
  // Small screens drop the dates, so the total and status fit.
  const wide = 'hidden sm:table-cell'

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {heading}
        {newInvoice}
      </div>
      <div className="flex flex-col gap-3">
        <Form action="/invoices" className="max-w-sm">
          <InputGroup>
            <InputGroupInput
              name="q"
              type="search"
              defaultValue={options.search}
              placeholder="Search by number or client"
              aria-label="Search invoices"
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          {/* A new search keeps the status filter and sort. */}
          {options.status && (
            <input type="hidden" name="status" value={options.status} />
          )}
          {options.sort && (
            <>
              <input type="hidden" name="sort" value={options.sort} />
              <input type="hidden" name="dir" value={options.dir} />
            </>
          )}
        </Form>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
          <StatusLink options={options} count={matched}>
            All
          </StatusLink>
          {listStatuses.map((status) => (
            <StatusLink
              key={status}
              options={options}
              status={status}
              count={counts[status] ?? 0}
            >
              {statusLabels[status]}
            </StatusLink>
          ))}
        </nav>
      </div>
      {invoices.length ? (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                {sortable('number', 'Number')}
                {sortable('client', 'Client')}
                {sortable('issued', 'Issued', { className: wide })}
                {sortable('due', 'Due', { className: wide })}
                {sortable('total', 'Total', { align: 'right' })}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="hover:underline"
                    >
                      {invoice.number ?? 'Draft'}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell className={cn(wide, 'text-muted-foreground')}>
                    {formatDate(invoice.issueDate)}
                  </TableCell>
                  <TableCell className={cn(wide, 'text-muted-foreground')}>
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(invoice.total, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge
                      status={displayStatus(invoice, today)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">
          No invoices match these filters.{' '}
          <Link href="/invoices" className="text-foreground underline">
            Show all invoices
          </Link>
        </p>
      )}
    </>
  )
}

function StatusLink({
  options,
  status,
  count,
  children,
}: {
  options: InvoiceListOptions
  status?: DisplayStatus
  count: number
  children: React.ReactNode
}) {
  const current = options.status === status
  return (
    <Button variant={current ? 'secondary' : 'ghost'} size="sm" asChild>
      <Link
        href={listHref(options, { status })}
        aria-current={current ? 'true' : undefined}
      >
        {children}
        <span className="text-muted-foreground tabular-nums">{count}</span>
      </Link>
    </Button>
  )
}

// A column header that sorts the list by its column, and shows which way
// it's sorted.
function SortableHead({
  options,
  sortKey,
  align,
  className,
  children,
}: {
  options: InvoiceListOptions
  sortKey: SortKey
  align?: 'right'
  className?: string
  children: React.ReactNode
}) {
  const sorted = options.sort === sortKey ? options.dir : undefined
  const Icon = !sorted ? ArrowUpDown : sorted === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={cn(align === 'right' && 'text-right', className)}
      aria-sort={
        sorted === 'asc'
          ? 'ascending'
          : sorted === 'desc'
            ? 'descending'
            : undefined
      }
    >
      <Link
        href={sortHref(options, sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:underline',
          // The arrow sits on the inside edge of a right-aligned header.
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn('size-3.5', !sorted && 'text-muted-foreground/60')}
        />
      </Link>
    </TableHead>
  )
}
