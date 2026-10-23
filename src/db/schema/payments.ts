import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { id } from './columns'
import { invoice } from './invoices'

// How a payment reached the business. Recorded by hand for now; Stripe
// payments come with Connect.
export const paymentMethods = [
  'bank_transfer',
  'card',
  'cash',
  'cheque',
  'other',
] as const
export type PaymentMethod = (typeof paymentMethods)[number]

// Money received against a sent invoice, in its currency. The invoice keeps
// the sum (amountPaid), updated in the same transaction, so lists can show
// and add up balances without reading every payment.
export const payment = pgTable(
  'payment',
  {
    id: id(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    // Minor units; see src/lib/money.ts.
    amount: bigint({ mode: 'number' }).notNull(),
    // The day it arrived, in the business's calendar.
    receivedOn: date({ mode: 'string' }).notNull(),
    method: text({ enum: paymentMethods }).notNull(),
    // The business's own note, e.g. a bank reference. Never printed.
    reference: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('payment_invoice_id_idx').on(table.invoiceId),
    check('payment_amount_positive', sql`${table.amount} > 0`),
    check(
      'payment_method_valid',
      sql`${table.method} in ('bank_transfer', 'card', 'cash', 'cheque', 'other')`,
    ),
  ],
)

export const paymentRelations = relations(payment, ({ one }) => ({
  invoice: one(invoice, {
    fields: [payment.invoiceId],
    references: [invoice.id],
  }),
}))
