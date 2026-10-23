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
  payment,
  type BusinessDetails,
  type InvoiceEventData,
  type InvoiceEventType,
  type InvoiceStatus,
  type PartyDetails,
} from '@/db/schema'
import { addDays, daysBetween } from '@/lib/dates'
import type { SortDirection, SortKey } from '@/lib/invoices/list'
import { formatInvoiceNumber } from '@/lib/invoices/number'
import type { PaymentValues } from '@/lib/invoices/payments'
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
  gt,
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
  sql<DisplayStatus>`case when ${invoice.status} <> 'sent' then ${invoice.status} when ${invoice.dueDate} < ${today} then 'overdue' when ${invoice.amountPaid} > 0 then 'partially_paid' else 'sent' end`

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
      amountPaid: invoice.amountPaid,
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

// What the business is owed in each currency: what's left to pay on every
// invoice awaiting payment, and the overdue part of that. Amounts in
// different currencies are never added together.
export async function outstandingTotals(organizationId: string, today: string) {
  const isOverdue = sql`${invoice.dueDate} < ${today}`
  const balance = sql`${invoice.total} - ${invoice.amountPaid}`
  return db
    .select({
      currency: invoice.currency,
      // Sums of bigints come back as numeric strings.
      outstanding: sql`sum(${balance})`.mapWith(Number),
      overdue:
        sql`coalesce(sum(${balance}) filter (where ${isOverdue}), 0)`.mapWith(
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
// Returns the number, or undefined when there is no such draft or it has
// nothing to pay.
export async function markInvoiceSent(organizationId: string, id: string) {
  return db.transaction(async (tx) => {
    // Lock the draft first, so sending it twice at once numbers it once.
    const [found] = await tx
      .select({ clientId: invoice.clientId })
      .from(invoice)
      .where(
        and(
          withStatus(organizationId, id, 'draft'),
          gt(invoice.total, 0),
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

// Records money received against an invoice awaiting payment, and marks
// it paid once nothing is left. Returns 'paid' or 'recorded', 'too_much'
// when the amount is more than what's left, or undefined when there is no
// such invoice awaiting payment.
export async function recordPayment(
  organizationId: string,
  id: string,
  values: PaymentValues,
) {
  return db.transaction(async (tx) => {
    // Locked, so two payments at once can't add up to more than the total.
    const [found] = await tx
      .select({ total: invoice.total, amountPaid: invoice.amountPaid })
      .from(invoice)
      .where(withStatus(organizationId, id, 'sent'))
      .for('update')
    if (!found) return undefined
    const amountPaid = found.amountPaid + values.amount
    if (amountPaid > found.total) return 'too_much'

    await tx.insert(payment).values({ invoiceId: id, ...values })
    const paid = amountPaid === found.total
    await tx
      .update(invoice)
      .set(
        paid
          ? { amountPaid, status: 'paid', paidOn: await lastPaymentDay(tx, id) }
          : { amountPaid },
      )
      .where(eq(invoice.id, id))
    await addEvent(tx, id, {
      type: 'payment_recorded',
      data: { amount: values.amount, paidOn: values.receivedOn },
    })
    return paid ? 'paid' : 'recorded'
  })
}

// Takes back a payment recorded by mistake, or one that bounced. A paid
// invoice is awaiting payment again. Returns false when there is no such
// payment.
export async function removePayment(organizationId: string, paymentId: string) {
  return db.transaction(async (tx) => {
    const [found] = await tx
      .select({
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        receivedOn: payment.receivedOn,
      })
      .from(payment)
      .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
      .where(
        and(
          eq(invoice.organizationId, organizationId),
          eq(payment.id, paymentId),
        ),
      )
      .for('update')
    if (!found) return false

    await tx.delete(payment).where(eq(payment.id, paymentId))
    await tx
      .update(invoice)
      .set({
        amountPaid: sql`${invoice.amountPaid} - ${found.amount}`,
        status: 'sent',
        paidOn: null,
      })
      .where(eq(invoice.id, found.invoiceId))
    await addEvent(tx, found.invoiceId, {
      type: 'payment_removed',
      data: { amount: found.amount, paidOn: found.receivedOn },
    })
    return true
  })
}

// An invoice's payments, in the order they arrived.
export async function listPayments(organizationId: string, id: string) {
  return db
    .select({
      id: payment.id,
      amount: payment.amount,
      receivedOn: payment.receivedOn,
      method: payment.method,
      reference: payment.reference,
    })
    .from(payment)
    .innerJoin(invoice, eq(invoice.id, payment.invoiceId))
    .where(and(eq(invoice.organizationId, organizationId), eq(invoice.id, id)))
    .orderBy(asc(payment.receivedOn), asc(payment.createdAt), asc(payment.id))
}

// Cancels a sent invoice for good. It keeps its number, so the sequence has
// no gaps. Payments must be removed first. Returns false when there is no
// such invoice awaiting payment, with nothing paid.
export async function voidInvoice(organizationId: string, id: string) {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(invoice)
      .set({ status: 'void', voidedAt: new Date() })
      .where(
        and(withStatus(organizationId, id, 'sent'), eq(invoice.amountPaid, 0)),
      )
      .returning({ id: invoice.id })
    if (updated.length === 0) return false
    await addEvent(tx, id, { type: 'voided' })
    return true
  })
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

// The day the latest of an invoice's payments arrived.
async function lastPaymentDay(tx: Transaction, invoiceId: string) {
  const [{ day }] = await tx
    .select({ day: sql<string>`max(${payment.receivedOn})` })
    .from(payment)
    .where(eq(payment.invoiceId, invoiceId))
  return day
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
