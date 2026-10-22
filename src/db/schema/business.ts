import { relations, sql } from 'drizzle-orm'
import { check, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { organization } from './auth'
import { id, timestamps } from './columns'

// The organization's own details, printed on every invoice it sends.
export const businessProfile = pgTable(
  'business_profile',
  {
    id: id(),
    organizationId: uuid()
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    logoUrl: text(),
    email: text(),
    taxId: text(),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    region: text(),
    postalCode: text(),
    // ISO 3166-1 alpha-2, e.g. "DE"
    country: text(),
    // ISO 4217, e.g. "EUR"
    defaultCurrency: text().notNull().default('USD'),
    invoicePrefix: text().notNull().default('INV'),
    // IANA, e.g. "Europe/Berlin". Decides when a day starts for the
    // business, for default issue dates and overdue invoices. Unset means
    // UTC.
    timeZone: text(),
    // How clients see invoices: Clean, or matching the owner's style.
    publicStyle: text({ enum: ['clean', 'match'] })
      .notNull()
      .default('clean'),
    ...timestamps,
  },
  (table) => [
    check('business_profile_country_iso', sql`${table.country} ~ '^[A-Z]{2}$'`),
    check(
      'business_profile_currency_iso',
      sql`${table.defaultCurrency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      'business_profile_invoice_prefix_length',
      sql`char_length(${table.invoicePrefix}) between 1 and 10`,
    ),
    check(
      'business_profile_public_style',
      sql`${table.publicStyle} in ('clean', 'match')`,
    ),
  ],
)

export const businessProfileRelations = relations(
  businessProfile,
  ({ one }) => ({
    organization: one(organization, {
      fields: [businessProfile.organizationId],
      references: [organization.id],
    }),
  }),
)
