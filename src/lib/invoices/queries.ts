import { db, type Database } from '@/db'
import { violatesForeignKey } from '@/db/errors'
import {
  businessProfile,
  client,
  invoice,
  invoiceCounter,
  invoiceLine,
  organization,
  type BusinessDetails,
  type InvoiceStatus,
  type PartyDetails,
} from '@/db/schema'
import { formatInvoiceNumber } from '@/lib/invoices/number'
import { invoiceTotals, type Line } from '@/lib/money'
import { and, asc, desc, eq, exists, sql } from 'drizzle-orm'

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

// Newest first. Filters, search and sorting come with the invoice list.
export async function listInvoices(organizationId: string) {
  return db
    .select({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      // As printed once sent; the client's current name for drafts.
      clientName: sql<string>`coalesce(${invoice.clientDetails}->>'name', ${client.name})`,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      total: invoice.total,
    })
    .from(invoice)
    .innerJoin(
      client,
      and(
        eq(client.organizationId, invoice.organizationId),
        eq(client.id, invoice.clientId),
      ),
    )
    .where(eq(invoice.organizationId, organizationId))
    .orderBy(desc(invoice.createdAt), desc(invoice.id))
}

export async function getInvoice(organizationId: string, id: string) {
  return db.query.invoice.findFirst({
    where: and(eq(invoice.organizationId, organizationId), eq(invoice.id, id)),
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
      })
      .where(eq(invoice.id, id))
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
  const updated = await db
    .update(invoice)
    .set({ status: 'paid', paidOn })
    .where(withStatus(organizationId, id, 'sent'))
    .returning({ id: invoice.id })
  return updated.length > 0
}

// Undoes marking an invoice paid, e.g. after a payment bounced. Returns
// false when there is no such paid invoice.
export async function markInvoiceUnpaid(organizationId: string, id: string) {
  const updated = await db
    .update(invoice)
    .set({ status: 'sent', paidOn: null })
    .where(withStatus(organizationId, id, 'paid'))
    .returning({ id: invoice.id })
  return updated.length > 0
}

// Cancels a sent invoice for good. It keeps its number, so the sequence has
// no gaps. Paid invoices must be marked unpaid first. Returns false when
// there is no such sent invoice.
export async function voidInvoice(organizationId: string, id: string) {
  const updated = await db
    .update(invoice)
    .set({ status: 'void', voidedAt: new Date() })
    .where(withStatus(organizationId, id, 'sent'))
    .returning({ id: invoice.id })
  return updated.length > 0
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
