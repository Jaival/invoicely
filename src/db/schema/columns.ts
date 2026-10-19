import { timestamp, uuid } from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

// Time-ordered UUIDv7 primary key. Postgres 17 has no uuidv7(), so it is
// generated in the app; sequential inserts avoid index fragmentation.
export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7())

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}
