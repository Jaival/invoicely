import { env } from '@/env/server'
import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool }

const pool =
  globalForDb.pool ?? new Pool({ connectionString: env.DATABASE_URL })
if (env.NODE_ENV !== 'production') globalForDb.pool = pool

// On Vercel Fluid compute, release idle clients before the function suspends.
attachDatabasePool(pool)

export const db = drizzle({ client: pool, schema, casing: 'snake_case' })
export type Database = typeof db
