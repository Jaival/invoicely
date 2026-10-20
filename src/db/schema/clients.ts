import { relations, sql } from 'drizzle-orm'
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { organization } from './auth'
import { id, timestamps } from './columns'

// Someone the organization invoices.
export const client = pgTable(
  'client',
  {
    id: id(),
    organizationId: uuid()
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    email: text(),
    taxId: text(),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    region: text(),
    postalCode: text(),
    // ISO 3166-1 alpha-2, e.g. "DE"
    country: text(),
    // Private to the organization; never printed on invoices.
    notes: text(),
    ...timestamps,
  },
  (table) => [
    index('client_organization_id_name_idx').on(
      table.organizationId,
      table.name,
    ),
    check('client_country_iso', sql`${table.country} ~ '^[A-Z]{2}$'`),
  ],
)

export const clientRelations = relations(client, ({ one }) => ({
  organization: one(organization, {
    fields: [client.organizationId],
    references: [organization.id],
  }),
}))
