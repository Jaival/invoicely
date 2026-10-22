import { InvoiceCards } from '@/components/invoices/invoice-cards'
import { InvoiceRowMenu } from '@/components/invoices/invoice-row-menu'
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
  listOrder,
  listTabs,
  PAGE_SIZE,
  pageNumbers,
  parseListOptions,
  sortHref,
  viewStatuses,
  type InvoiceListOptions,
  type ListView,
  type SortKey,
} from '@/lib/invoices/list'
import {
  countInvoicesByStatus,
  listInvoices,
  outstandingTotals,
} from '@/lib/invoices/queries'
import { displayStatus, dueLabel } from '@/lib/invoices/status'
import { formatMoney } from '@/lib/money'
import { businessToday } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { cn } from 'cn'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
} from 'lucide-react'
import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Invoices' }

const viewLabels: Record<ListView, string> = {
  open: 'Open',
  overdue: 'Overdue',
  draft: 'Drafts',
  paid: 'Paid',
  all: 'All',
  sent: 'Sent',
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
  const [invoices, counts, owed] = await Promise.all([
    listInvoices(organizationId, today, {
      search: options.search,
      statuses: viewStatuses[options.view],
      ...listOrder(options),
      limit: PAGE_SIZE,
      offset: (options.page - 1) * PAGE_SIZE,
    }),
    countInvoicesByStatus(organizationId, today, options.search),
    options.view === 'open' ? outstandingTotals(organizationId, today) : [],
  ])
  const matched = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const viewCount = (view: ListView) =>
    viewStatuses[view]?.reduce(
      (sum, status) => sum + (counts[status] ?? 0),
      0,
    ) ?? matched
  // A view without a tab, reached by URL, shows as one while it's open.
  const tabs: ListView[] = [...listTabs]
  if (!tabs.includes(options.view)) tabs.push(options.view)

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
        <Empty className="panel">
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
  // Only the ledger needs the issue date; elsewhere what matters is when
  // it's due.
  const showIssued = options.view === 'all'

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
          {/* A new search keeps the view and sort. */}
          {options.view !== 'open' && (
            <input type="hidden" name="status" value={options.view} />
          )}
          {options.sort && (
            <>
              <input type="hidden" name="sort" value={options.sort} />
              <input type="hidden" name="dir" value={options.dir} />
            </>
          )}
        </Form>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
          {tabs.map((view) => (
            <ViewLink
              key={view}
              options={options}
              view={view}
              count={viewCount(view)}
            >
              {viewLabels[view]}
            </ViewLink>
          ))}
        </nav>
      </div>
      {owed.length > 0 && <OwedTotals owed={owed} />}
      {invoices.length ? (
        <>
          <InvoiceCards
            invoices={invoices}
            today={today}
            className="sm:hidden"
          />
          <div className="hidden panel sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {sortable('number', 'Number')}
                  {sortable('client', 'Client')}
                  {showIssued && sortable('issued', 'Issued')}
                  {sortable('due', 'Due')}
                  {sortable('total', 'Total', { align: 'right' })}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = displayStatus(invoice, today)
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-figures font-medium">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.number ?? 'Draft'}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      {showIssued && (
                        <TableCell className="font-figures text-muted-foreground">
                          {formatDate(invoice.issueDate)}
                        </TableCell>
                      )}
                      <TableCell
                        className={cn(
                          status === 'overdue'
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {dueLabel(invoice, today) ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-figures tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={status} />
                      </TableCell>
                      <TableCell className="py-0">
                        <InvoiceRowMenu
                          invoice={invoice}
                          status={status}
                          today={today}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : options.page > 1 ? (
        // Past the last page, e.g. from an old link.
        <p className="text-muted-foreground">
          There are no invoices on this page.{' '}
          <Link
            href={listHref(options, { page: 1 })}
            className="text-foreground underline"
          >
            Go to the first page
          </Link>
        </p>
      ) : (
        <p className="text-muted-foreground">
          {options.view === 'open' && !options.search
            ? 'Nothing open: every invoice is paid or void.'
            : 'No invoices match these filters.'}{' '}
          <Link
            href="/invoices?status=all"
            className="text-foreground underline"
          >
            Show all invoices
          </Link>
        </p>
      )}
      {invoices.length > 0 && viewCount(options.view) > PAGE_SIZE && (
        <Pages options={options} count={viewCount(options.view)} />
      )}
    </>
  )
}

// Numbered pages of the list: where this page is in it, and links to the
// others. On a phone, just the previous and next pages.
function Pages({
  options,
  count,
}: {
  options: InvoiceListOptions
  count: number
}) {
  const { page } = options
  const last = Math.ceil(count / PAGE_SIZE)
  const to = (target: number) => listHref(options, { page: target })

  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="font-figures text-muted-foreground tabular-nums">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of{' '}
        {count}
      </p>
      <div className="flex items-center gap-1">
        <StepLink href={page > 1 ? to(page - 1) : undefined} rel="prev">
          <ChevronLeft />
          Previous
        </StepLink>
        <div className="hidden items-center gap-1 sm:flex">
          {pageNumbers(page, last).map((number, i) =>
            number === 'gap' ? (
              <span key={`gap-${i}`} aria-hidden className="px-1">
                …
              </span>
            ) : (
              <Button
                key={number}
                variant={number === page ? 'secondary' : 'ghost'}
                size="sm"
                className="min-w-8 font-figures tabular-nums"
                asChild
              >
                <Link
                  href={to(number)}
                  aria-label={`Page ${number}`}
                  aria-current={number === page ? 'page' : undefined}
                >
                  {number}
                </Link>
              </Button>
            ),
          )}
        </div>
        <StepLink href={page < last ? to(page + 1) : undefined} rel="next">
          Next
          <ChevronRight />
        </StepLink>
      </div>
    </nav>
  )
}

// Previous or Next; disabled at either end.
function StepLink({
  href,
  rel,
  children,
}: {
  href?: string
  rel: 'prev' | 'next'
  children: React.ReactNode
}) {
  if (!href) {
    return (
      <Button variant="ghost" size="sm" disabled>
        {children}
      </Button>
    )
  }
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href} rel={rel}>
        {children}
      </Link>
    </Button>
  )
}

// What the business is owed, per currency: everything sent and unpaid, and
// how much of it is overdue.
function OwedTotals({
  owed,
}: {
  owed: Awaited<ReturnType<typeof outstandingTotals>>
}) {
  const overdue = owed.filter((row) => row.overdue > 0)
  const amounts = (rows: typeof owed, key: 'outstanding' | 'overdue') =>
    rows.map((row) => (
      <span key={row.currency} className="block">
        {formatMoney(row[key], row.currency)}
      </span>
    ))

  return (
    <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
      <div className="panel p-4">
        <dt className="text-sm text-muted-foreground">Outstanding</dt>
        <dd className="mt-1 font-figures text-xl font-semibold tabular-nums">
          {amounts(owed, 'outstanding')}
        </dd>
      </div>
      <div className="panel p-4">
        <dt className="text-sm text-muted-foreground">Overdue</dt>
        <dd
          className={cn(
            'mt-1 font-figures text-xl font-semibold tabular-nums',
            overdue.length > 0 && 'text-destructive',
          )}
        >
          {overdue.length > 0 ? amounts(overdue, 'overdue') : 'Nothing'}
        </dd>
      </div>
    </dl>
  )
}

function ViewLink({
  options,
  view,
  count,
  children,
}: {
  options: InvoiceListOptions
  view: ListView
  count: number
  children: React.ReactNode
}) {
  const current = options.view === view
  return (
    <Button
      variant={current ? 'secondary' : 'ghost'}
      size="sm"
      className={cn(
        current &&
          'brutal:bg-accent brutal:text-accent-foreground brutal:hover:bg-accent',
      )}
      asChild
    >
      <Link
        href={listHref(options, { view })}
        aria-current={current ? 'true' : undefined}
      >
        {children}
        <span
          className={cn(
            'font-figures text-muted-foreground tabular-nums',
            current && 'brutal:text-accent-foreground',
          )}
        >
          {count}
        </span>
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
  const order = listOrder(options)
  const sorted = order.sort === sortKey ? order.dir : undefined
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
