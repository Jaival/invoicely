import { PageTitle } from '@/components/app/page-title'
import { MoneyStat } from '@/components/invoices/money-stat'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { formatMonth } from '@/lib/dates'
import { listHref, parseListOptions, type ListView } from '@/lib/invoices/list'
import {
  countInvoicesByStatus,
  outstandingTotals,
  paidThisMonth,
} from '@/lib/invoices/queries'
import {
  businessToday,
  getActiveOrganization,
  getBusinessProfile,
} from '@/lib/organization'
import { requireOrganizationId, requireSession } from '@/lib/session'
import { FileText, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }

// The invoice list's tab behind a figure.
const tabHref = (view: ListView) => listHref(parseListOptions({}), { view })

export default async function DashboardPage() {
  const [{ user }, organizationId] = await Promise.all([
    requireSession(),
    requireOrganizationId(),
  ])
  const today = await businessToday(organizationId)
  const [activeOrganization, profile, counts, owed, paid] = await Promise.all([
    getActiveOrganization(organizationId),
    getBusinessProfile(organizationId),
    countInvoicesByStatus(organizationId, today),
    outstandingTotals(organizationId, today),
    paidThisMonth(organizationId, today),
  ])
  const hasInvoices = Object.values(counts).some((n) => n > 0)

  return (
    <>
      <div className="flex flex-col gap-1">
        <PageTitle>Welcome, {user.name}</PageTitle>
        {/* The business, and the month "Paid this month" is about. */}
        <p className="text-muted-foreground">
          {activeOrganization && <>{activeOrganization.name} · </>}
          {formatMonth(today)}
        </p>
      </div>
      {!profile && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Set up your business profile</CardTitle>
            <CardDescription>
              Add your business name, address and currency. They appear on every
              invoice you send.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/settings/business">Set up profile</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
      {hasInvoices ? (
        // Each currency on its own line: amounts in different currencies are
        // never added together.
        <dl
          aria-label="Totals"
          className="grid items-start gap-3 sm:max-w-3xl sm:grid-cols-3"
        >
          <MoneyStat
            title="Outstanding"
            href={tabHref('open')}
            amounts={owed.map((row) => ({
              currency: row.currency,
              amount: row.outstanding,
            }))}
          />
          <MoneyStat
            title="Overdue"
            tone="overdue"
            href={tabHref('overdue')}
            amounts={owed.map((row) => ({
              currency: row.currency,
              amount: row.overdue,
            }))}
          />
          <MoneyStat
            title="Paid this month"
            tone="paid"
            href={tabHref('paid')}
            amounts={paid.map((row) => ({
              currency: row.currency,
              amount: row.paid,
            }))}
          />
        </dl>
      ) : (
        <Empty className="panel">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Nothing to add up yet</EmptyTitle>
            <EmptyDescription>
              Send your first invoice, and what you’re owed, what’s overdue and
              what you’ve been paid this month show up here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/invoices/new">
                <Plus data-icon="inline-start" />
                New invoice
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}
