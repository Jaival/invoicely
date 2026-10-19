import { sql } from 'drizzle-orm'
import { timestamp, uuid } from 'drizzle-orm/pg-core'

// Time-ordered UUIDv7 primary key (native in Postgres 18). Sequential
// inserts avoid the index fragmentation of random UUIDv4 keys.
export const id = () =>
  uuid()
    .primaryKey()
    .default(sql`uuidv7()`)

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}
