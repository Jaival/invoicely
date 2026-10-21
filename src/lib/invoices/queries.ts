import { db, type Database } from '@/db'
import { violatesForeignKey } from '@/db/errors'
import {
  businessProfile,
  client,
  invoice,
  invoiceCounter,
  invoiceEvent,
  invoiceLine,
  organization,
  type BusinessDetails,
  type InvoiceEventData,
  type InvoiceEventType,
  type InvoiceStatus,
  type PartyDetails,
} from '@/db/schema'
import { addDays, daysBetween } from '@/lib/dates'
import type { SortDirection, SortKey } from '@/lib/invoices/list'
import { formatInvoiceNumber } from '@/lib/invoices/number'
import { isPublicToken, newPublicToken } from '@/lib/invoices/public-token'
import type { DisplayStatus } from '@/lib/invoices/status'
import { invoiceTotals, type Line } from '@/lib/money'
import { containsPattern } from '@/lib/search'
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'

// Every query takes the organization, so one business can never read or
// change another's invoices. Callers pass the session's organization.

export type LineValues = Line & { description: string }

export type InvoiceValues = {
  clientId: string
  currency: string
  // YYYY-MM-DD
  issueDate: string
  dueDate: string
  notes: string | null
  terms: string | null
  lines: LineValues[]
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export type ListFilters = {
  // Matches the number or the client's name.
  search?: string
  // Every status when unset.
  statuses?: readonly DisplayStatus[]
  // Newest first when unset.
  sort?: SortKey
  dir?: SortDirection
  // One page of the list; all of it when unset.
  limit?: number
  offset?: number
}

// The client's name as printed once sent; their current name for drafts.
const clientName = sql<string>`coalesce(${invoice.clientDetails}->>'name', ${client.name})`

// The status as shown (see displayStatus), worked out in the database so it
// can be filtered and counted. today is the business's.
const displayStatusSql = (today: string) =>
  sql<DisplayStatus>`case when ${invoice.status} = 'sent' and ${invoice.dueDate} < ${today} then 'overdue' else ${invoice.status} end`

const withClient = and(
  eq(client.organizationId, invoice.organizationId),
  eq(client.id, invoice.clientId),
)

function matching(organizationId: string, search = '') {
  const term = search.trim()
  const pattern = containsPattern(term)
  return and(
    eq(invoice.organizationId, organizationId),
    term
      ? or(ilike(invoice.number, pattern), ilike(clientName, pattern))
      : undefined,
  )
}

// The business's invoices, searched, filtered by status and sorted. today
// is the business's, which decides which invoices are overdue.
export async function listInvoices(
  organizationId: string,
  today: string,
  { search, statuses, sort, dir = 'desc', limit, offset = 0 }: ListFilters = {},
) {
  // From a fixed pair of keywords, never user input.
  const direction = sql.raw(dir === 'asc' ? 'asc' : 'desc')
  const orderings: Record<SortKey, SQL[]> = {
    // Drafts have no number yet; they go last either way.
    number: [sql`${invoice.sequence} ${direction} nulls last`],
    client: [sql`lower(${clientName}) ${direction}`],
    issued: [sql`${invoice.issueDate} ${direction}`],
    // Drafts aren't due until they're sent; they go last either way.
    due: [
      sql`${invoice.status} = 'draft'`,
      sql`${invoice.dueDate} ${direction}`,
    ],
    // Amounts only compare within a currency, so currencies are grouped.
    total: [asc(invoice.currency), sql`${invoice.total} ${direction}`],
  }

  const query = db
    .select({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      clientName,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidOn: invoice.paidOn,
      total: invoice.total,
      publicToken: invoice.publicToken,
    })
    .from(invoice)
    .innerJoin(client, withClient)
    .where(
      and(
        matching(organizationId, search),
        statuses ? inArray(displayStatusSql(today), statuses) : undefined,
      ),
    )
    .orderBy(
      ...(sort ? orderings[sort] : []),
      desc(invoice.createdAt),
      // Last, so the order is total and pages never repeat or skip a row.
      desc(invoice.id),
    )
    .$dynamic()
  return limit === undefined ? query : query.limit(limit).offset(offset)
}

// How many invoices the search matches in each status, for the status
// filter's labels.
export async function countInvoicesByStatus(
  organizationId: string,
  today: string,
  search?: string,
) {
  const rows = await db
    .select({ status: displayStatusSql(today), count: count() })
    .from(invoice)
    .innerJoin(client, withClient)
    .where(matching(organizationId, search))
    // By position: the status expression's date parameter would make a
    // repeated expression look different to Postgres.
    .groupBy(sql`1`)
  return Object.fromEntries(
    rows.map((row) => [row.status, row.count]),
  ) as Partial<Record<DisplayStatus, number>>
}

// What the business is owed in each currency: every sent, unpaid invoice,
// and the overdue part of that. Amounts in different currencies are never
// added together.
export async function outstandingTotals(organizationId: string, today: string) {
  const isOverdue = sql`${invoice.dueDate} < ${today}`
  return db
    .select({
      currency: invoice.currency,
      // Sums of bigints come back as numeric strings.
      outstanding: sql`sum(${invoice.total})`.mapWith(Number),
      overdue:
        sql`coalesce(sum(${invoice.total}) filter (where ${isOverdue}), 0)`.mapWith(
          Number,
        ),
    })
    .from(invoice)
    .where(
      and(
        eq(invoice.organizationId, organizationId),
        eq(invoice.status, 'sent'),
      ),
    )
    .groupBy(invoice.currency)
    .orderBy(asc(invoice.currency))
}

export async function getInvoice(organizationId: string, id: string) {
  return db.query.invoice.findFirst({
    where: and(eq(invoice.organizationId, organizationId), eq(invoice.id, id)),
    with: { lines: { orderBy: [asc(invoiceLine.position)] } },
  })
}

// A sent invoice found by its public link, for clients who don't sign in.
// The token is the only key: it's unguessable, so it stands in for a
// session. Drafts have no token.
export async function getPublicInvoice(token: string) {
  if (!isPublicToken(token)) return undefined
  return db.query.invoice.findFirst({
    where: eq(invoice.publicToken, token),
    with: { lines: { orderBy: [asc(invoiceLine.position)] } },
  })
}

// Creates a draft. Returns undefined when the client isn't one of this
// organization's.
export async function createInvoice(
  organizationId: string,
  { lines, ...values }: InvoiceValues,
) {
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(invoice)
        .values({ organizationId, ...values, ...totals(lines) })
        .returning({ id: invoice.id })
      await insertLines(tx, created.id, lines)
      return created.id
    })
  } catch (error) {
    if (violatesForeignKey(error, 'invoice_client_fk')) return undefined
    throw error
  }
}

// Copies an invoice, in any status, into a new draft for the same client:
// dated issueDate, and due as long after that as the original was. Returns
// the draft's id, or undefined when there is no such invoice.
export async function duplicateInvoice(
  organizationId: string,
  id: string,
  issueDate: string,
) {
  const source = await getInvoice(organizationId, id)
  if (!source) return undefined
  return createInvoice(organizationId, {
    clientId: source.clientId,
    currency: source.currency,
    issueDate,
    dueDate: addDays(issueDate, daysBetween(source.issueDate, source.dueDate)),
    notes: source.notes,
    terms: source.terms,
    lines: source.lines.map(
      ({ description, quantity, unitPrice, taxRate, discountRate }) => ({
        description,
        quantity,
        unitPrice,
        taxRate,
        discountRate,
      }),
    ),
  })
}

// Replaces a draft's details and lines. Returns false when there is no such
// draft in this organization (sent invoices can't be edited), or the client
// isn't one of this organization's.
export async function updateDraft(
  organizationId: string,
  id: string,
  { lines, ...values }: InvoiceValues,
) {
  try {
    return await db.transaction(async (tx) => {
      const updated = await tx
        .update(invoice)
        .set({ ...values, ...totals(lines) })
        .where(withStatus(organizationId, id, 'draft'))
        .returning({ id: invoice.id })
      if (updated.length === 0) return false
      await tx.delete(invoiceLine).where(eq(invoiceLine.invoiceId, id))
      await insertLines(tx, id, lines)
      return true
    })
  } catch (error) {
    if (violatesForeignKey(error, 'invoice_client_fk')) return false
    throw error
  }
}

// Drafts have no number yet, so deleting one leaves no gap. Sent invoices
// are voided instead.
export async function deleteDraft(organizationId: string, id: string) {
  const deleted = await db
    .delete(invoice)
    .where(withStatus(organizationId, id, 'draft'))
    .returning({ id: invoice.id })
  return deleted.length > 0
}

// Gives a draft the organization's next invoice number, copies the
// business's and client's current details onto it, and marks it sent.
// Returns the number, or undefined when there is no such draft or it has no
// lines.
export async function markInvoiceSent(organizationId: string, id: string) {
  return db.transaction(async (tx) => {
    // Lock the draft first, so sending it twice at once numbers it once.
    const [found] = await tx
      .select({ clientId: invoice.clientId })
      .from(invoice)
      .where(
        and(
          withStatus(organizationId, id, 'draft'),
          exists(
            tx
              .select({ id: invoiceLine.id })
              .from(invoiceLine)
              .where(eq(invoiceLine.invoiceId, invoice.id)),
          ),
        ),
      )
      .for('update')
    if (!found) return undefined

    // Locks the counter until commit; a rollback hands the number back.
    const [{ sequence }] = await tx
      .insert(invoiceCounter)
      .values({ organizationId, lastSequence: 1 })
      .onConflictDoUpdate({
        target: invoiceCounter.organizationId,
        set: { lastSequence: sql`${invoiceCounter.lastSequence} + 1` },
      })
      .returning({ sequence: invoiceCounter.lastSequence })

    const [business] = await tx
      .select({ name: organization.name, profile: businessProfile })
      .from(organization)
      .leftJoin(
        businessProfile,
        eq(businessProfile.organizationId, organization.id),
      )
      .where(eq(organization.id, organizationId))
    const [billed] = await tx
      .select()
      .from(client)
      .where(
        and(
          eq(client.organizationId, organizationId),
          eq(client.id, found.clientId),
        ),
      )

    // The business profile's defaults, for organizations without one yet.
    const profile = business.profile
    const number = formatInvoiceNumber(
      profile?.invoicePrefix ?? 'INV',
      sequence,
    )
    const businessDetails: BusinessDetails = profile
      ? { ...partyDetails(profile), logoUrl: profile.logoUrl }
      : { ...partyDetails({ name: business.name }), logoUrl: null }

    await tx
      .update(invoice)
      .set({
        status: 'sent',
        sequence,
        number,
        businessDetails,
        clientDetails: partyDetails(billed),
        sentAt: new Date(),
        publicToken: newPublicToken(),
      })
      .where(withStatus(organizationId, id, 'draft'))
    await addEvent(tx, id, { type: 'sent' })
    return number
  })
}

// Records that a sent invoice was paid, on the given day. Returns false when
// there is no such sent invoice.
export async function markInvoicePaid(
  organizationId: string,
  id: string,
  paidOn: string,
) {
  return changeStatus(
    organizationId,
    id,
    'sent',
    { status: 'paid', paidOn },
    { type: 'paid', data: { paidOn } },
  )
}

// Undoes marking an invoice paid, e.g. after a payment bounced. Returns
// false when there is no such paid invoice.
export async function markInvoiceUnpaid(organizationId: string, id: string) {
  return changeStatus(
    organizationId,
    id,
    'paid',
    { status: 'sent', paidOn: null },
    { type: 'unpaid' },
  )
}

// Cancels a sent invoice for good. It keeps its number, so the sequence has
// no gaps. Paid invoices must be marked unpaid first. Returns false when
// there is no such sent invoice.
export async function voidInvoice(organizationId: string, id: string) {
  return changeStatus(
    organizationId,
    id,
    'sent',
    { status: 'void', voidedAt: new Date() },
    { type: 'voided' },
  )
}

// Logs that a sent invoice was emailed to its client. Returns false when
// there is no such sent invoice.
export async function recordInvoiceEmailed(
  organizationId: string,
  id: string,
  to: string,
) {
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select({ id: invoice.id })
      .from(invoice)
      .where(
        and(
          eq(invoice.organizationId, organizationId),
          eq(invoice.id, id),
          ne(invoice.status, 'draft'),
        ),
      )
    if (!found) return false
    await addEvent(tx, id, { type: 'emailed', data: { to } })
    return true
  })
}

// An invoice's activity log, oldest first.
export async function listInvoiceEvents(organizationId: string, id: string) {
  return db
    .select({
      id: invoiceEvent.id,
      type: invoiceEvent.type,
      data: invoiceEvent.data,
      createdAt: invoiceEvent.createdAt,
    })
    .from(invoiceEvent)
    .innerJoin(invoice, eq(invoice.id, invoiceEvent.invoiceId))
    .where(and(eq(invoice.organizationId, organizationId), eq(invoice.id, id)))
    .orderBy(asc(invoiceEvent.createdAt), asc(invoiceEvent.id))
}

// Moves an invoice from one status to another and logs it, together.
// Returns false when there is no such invoice in that status.
async function changeStatus(
  organizationId: string,
  id: string,
  from: InvoiceStatus,
  values: Partial<typeof invoice.$inferInsert>,
  event: Event,
) {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(invoice)
      .set(values)
      .where(withStatus(organizationId, id, from))
      .returning({ id: invoice.id })
    if (updated.length === 0) return false
    await addEvent(tx, id, event)
    return true
  })
}

type Event = { type: InvoiceEventType; data?: InvoiceEventData }

async function addEvent(tx: Transaction, invoiceId: string, event: Event) {
  await tx.insert(invoiceEvent).values({ invoiceId, ...event })
}

function withStatus(organizationId: string, id: string, status: InvoiceStatus) {
  return and(
    eq(invoice.organizationId, organizationId),
    eq(invoice.id, id),
    eq(invoice.status, status),
  )
}

// The printed fields of a business profile or client.
function partyDetails(
  party: Partial<Record<keyof PartyDetails, string | null>> & { name: string },
): PartyDetails {
  return {
    name: party.name,
    email: party.email ?? null,
    taxId: party.taxId ?? null,
    addressLine1: party.addressLine1 ?? null,
    addressLine2: party.addressLine2 ?? null,
    city: party.city ?? null,
    region: party.region ?? null,
    postalCode: party.postalCode ?? null,
    country: party.country ?? null,
  }
}

function totals(lines: LineValues[]) {
  const { subtotal, discount, tax, total } = invoiceTotals(lines)
  return { subtotal, discount, tax, total }
}

async function insertLines(
  tx: Transaction,
  invoiceId: string,
  lines: LineValues[],
) {
  if (lines.length === 0) return
  await tx
    .insert(invoiceLine)
    .values(lines.map((line, position) => ({ invoiceId, position, ...line })))
}
