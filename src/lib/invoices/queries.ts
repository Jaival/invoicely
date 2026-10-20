import { db, type Database } from '@/db'
import { violatesForeignKey } from '@/db/errors'
import {
  businessProfile,
  invoice,
  invoiceCounter,
  invoiceLine,
} from '@/db/schema'
import { formatInvoiceNumber } from '@/lib/invoices/number'
import { invoiceTotals, type Line } from '@/lib/money'
import { and, asc, eq, sql } from 'drizzle-orm'

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
        .where(draft(organizationId, id))
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
    .where(draft(organizationId, id))
    .returning({ id: invoice.id })
  return deleted.length > 0
}

// Gives a draft the organization's next invoice number and marks it sent.
// Returns the number, or undefined when there is no such draft.
export async function markInvoiceSent(organizationId: string, id: string) {
  return db.transaction(async (tx) => {
    // Lock the draft first, so sending it twice at once numbers it once.
    const [found] = await tx
      .select({ id: invoice.id })
      .from(invoice)
      .where(draft(organizationId, id))
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

    const [profile] = await tx
      .select({ prefix: businessProfile.invoicePrefix })
      .from(businessProfile)
      .where(eq(businessProfile.organizationId, organizationId))
    // The business profile's default, for organizations without one yet.
    const number = formatInvoiceNumber(profile?.prefix ?? 'INV', sequence)

    await tx
      .update(invoice)
      .set({ status: 'sent', sequence, number })
      .where(eq(invoice.id, id))
    return number
  })
}

function draft(organizationId: string, id: string) {
  return and(
    eq(invoice.organizationId, organizationId),
    eq(invoice.id, id),
    eq(invoice.status, 'draft'),
  )
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
