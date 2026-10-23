import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { organization } from './auth'
import { client } from './clients'
import { id, timestamps } from './columns'
import { payment } from './payments'

// Overdue is not stored: it is a sent invoice past its due date (see
// src/lib/invoices/status.ts).
export const invoiceStatuses = ['draft', 'sent', 'paid', 'void'] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

// A business or client as printed on an invoice, copied when it's sent so
// later edits to either don't change invoices already sent.
export type PartyDetails = {
  name: string
  email: string | null
  taxId: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  // ISO 3166-1 alpha-2
  country: string | null
}
export type BusinessDetails = PartyDetails & { logoUrl: string | null }

// The last invoice number each organization handed out. Taking the next one
// locks the row until the transaction ends, so numbers never repeat, and a
// rolled-back transaction gives its number back, so they never skip.
export const invoiceCounter = pgTable('invoice_counter', {
  organizationId: uuid()
    .primaryKey()
    .references(() => organization.id, { onDelete: 'cascade' }),
  lastSequence: integer().notNull(),
})

// Amounts are integer minor units; see src/lib/money.ts.
export const invoice = pgTable(
  'invoice',
  {
    id: id(),
    organizationId: uuid()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    clientId: uuid().notNull(),
    status: text({ enum: invoiceStatuses }).notNull().default('draft'),
    // Assigned when the invoice is sent; drafts have neither. The number is
    // kept as printed, so changing the prefix later doesn't rewrite it.
    sequence: integer(),
    number: text(),
    // ISO 4217, e.g. "EUR"
    currency: text().notNull(),
    issueDate: date({ mode: 'string' }).notNull(),
    dueDate: date({ mode: 'string' }).notNull(),
    // Printed on the invoice.
    notes: text(),
    terms: text(),
    // Totals of the lines, saved with them so lists can show and sort by them.
    subtotal: bigint({ mode: 'number' }).notNull().default(0),
    discount: bigint({ mode: 'number' }).notNull().default(0),
    tax: bigint({ mode: 'number' }).notNull().default(0),
    total: bigint({ mode: 'number' }).notNull().default(0),
    // The sum of its payments (see payment), so the balance is total minus
    // this.
    amountPaid: bigint({ mode: 'number' }).notNull().default(0),
    // Copied when sent; drafts show the current details instead.
    businessDetails: jsonb().$type<BusinessDetails>(),
    clientDetails: jsonb().$type<PartyDetails>(),
    sentAt: timestamp({ withTimezone: true }),
    // The secret in the invoice's public link (/i/<token>), for clients who
    // don't sign in. Set when sent, so drafts can't be opened.
    publicToken: text().unique(),
    // The day the last of the balance arrived, in the business's calendar.
    paidOn: date({ mode: 'string' }),
    voidedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    // Through the organization too, so an invoice can only bill a client of
    // its own organization. No action (not restrict) lets an organization's
    // deletion cascade to both tables, while deleting a client with
    // invoices fails.
    foreignKey({
      name: 'invoice_client_fk',
      columns: [table.organizationId, table.clientId],
      foreignColumns: [client.organizationId, client.id],
    }),
    index('invoice_organization_id_client_id_idx').on(
      table.organizationId,
      table.clientId,
    ),
    unique('invoice_organization_id_sequence_unique').on(
      table.organizationId,
      table.sequence,
    ),
    unique('invoice_organization_id_number_unique').on(
      table.organizationId,
      table.number,
    ),
    check(
      'invoice_status_valid',
      sql`${table.status} in ('draft', 'sent', 'paid', 'void')`,
    ),
    // Once sent, an invoice keeps its number for good; it can be voided but
    // never return to draft.
    check(
      'invoice_numbered_unless_draft',
      sql`(${table.status} = 'draft') = (${table.sequence} is null) and (${table.sequence} is null) = (${table.number} is null)`,
    ),
    // Each status carries what it needs, and nothing it doesn't.
    check(
      'invoice_sent_details_unless_draft',
      sql`(${table.status} = 'draft') = (${table.sentAt} is null) and (${table.sentAt} is null) = (${table.businessDetails} is null) and (${table.sentAt} is null) = (${table.clientDetails} is null)`,
    ),
    check(
      'invoice_paid_on_when_paid',
      sql`(${table.status} = 'paid') = (${table.paidOn} is not null)`,
    ),
    // Paid means nothing is left to pay, and only invoices awaiting payment
    // can have part of it paid. Drafts and void invoices have none.
    check(
      'invoice_amount_paid_matches_status',
      sql`${table.amountPaid} >= 0 and case ${table.status} when 'paid' then ${table.amountPaid} = ${table.total} when 'sent' then ${table.amountPaid} = 0 or ${table.amountPaid} < ${table.total} else ${table.amountPaid} = 0 end`,
    ),
    check(
      'invoice_voided_at_when_void',
      sql`(${table.status} = 'void') = (${table.voidedAt} is not null)`,
    ),
    check('invoice_currency_iso', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'invoice_due_after_issue',
      sql`${table.dueDate} >= ${table.issueDate}`,
    ),
  ],
)

export const invoiceLine = pgTable(
  'invoice_line',
  {
    id: id(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    // Order on the invoice, from 0.
    position: integer().notNull(),
    description: text().notNull(),
    // Thousandths: 1.5 hours is 1500.
    quantity: integer().notNull(),
    // Minor units, before discount and tax.
    unitPrice: bigint({ mode: 'number' }).notNull(),
    // Basis points: 19% is 1900.
    taxRate: integer().notNull().default(0),
    discountRate: integer().notNull().default(0),
  },
  (table) => [
    unique('invoice_line_invoice_id_position_unique').on(
      table.invoiceId,
      table.position,
    ),
    check('invoice_line_quantity_not_negative', sql`${table.quantity} >= 0`),
    check('invoice_line_unit_price_not_negative', sql`${table.unitPrice} >= 0`),
    check(
      'invoice_line_tax_rate_range',
      sql`${table.taxRate} between 0 and 10000`,
    ),
    check(
      'invoice_line_discount_rate_range',
      sql`${table.discountRate} between 0 and 10000`,
    ),
  ],
)

// What has happened to a sent invoice, for its activity log.
export const invoiceEventTypes = [
  'sent',
  'emailed',
  // Marked paid in full, before payments were recorded one by one.
  'paid',
  'unpaid',
  'payment_recorded',
  'payment_removed',
  'voided',
] as const
export type InvoiceEventType = (typeof invoiceEventTypes)[number]

// The details an event carries: the address an invoice was emailed to, the
// day a payment arrived and how much it was (in the invoice's currency).
export type InvoiceEventData = {
  to?: string
  paidOn?: string
  amount?: number
}

// Added in the same transaction as the change it records, never edited.
export const invoiceEvent = pgTable(
  'invoice_event',
  {
    id: id(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    type: text({ enum: invoiceEventTypes }).notNull(),
    data: jsonb().$type<InvoiceEventData>(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('invoice_event_invoice_id_created_at_idx').on(
      table.invoiceId,
      table.createdAt,
    ),
    check(
      'invoice_event_type_valid',
      sql`${table.type} in ('sent', 'emailed', 'paid', 'unpaid', 'payment_recorded', 'payment_removed', 'voided')`,
    ),
  ],
)

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  organization: one(organization, {
    fields: [invoice.organizationId],
    references: [organization.id],
  }),
  client: one(client, {
    fields: [invoice.clientId],
    references: [client.id],
  }),
  lines: many(invoiceLine),
  events: many(invoiceEvent),
  payments: many(payment),
}))

export const invoiceLineRelations = relations(invoiceLine, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceLine.invoiceId],
    references: [invoice.id],
  }),
}))

export const invoiceEventRelations = relations(invoiceEvent, ({ one }) => ({
  invoice: one(invoice, {
    fields: [invoiceEvent.invoiceId],
    references: [invoice.id],
  }),
}))
