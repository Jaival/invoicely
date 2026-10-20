import { DrizzleQueryError } from 'drizzle-orm/errors'
import { DatabaseError } from 'pg'

// Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const FOREIGN_KEY_VIOLATION = '23503'

// Drizzle wraps the driver's error, so look at its cause too.
function databaseError(error: unknown) {
  const cause = error instanceof DrizzleQueryError ? error.cause : error
  return cause instanceof DatabaseError ? cause : undefined
}

// True when a write broke the named foreign key, e.g. by deleting a row that
// others still point at.
export function violatesForeignKey(error: unknown, constraint: string) {
  const cause = databaseError(error)
  return (
    cause?.code === FOREIGN_KEY_VIOLATION && cause.constraint === constraint
  )
}
