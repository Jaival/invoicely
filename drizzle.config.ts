import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'

// Load .env.local the same way Next.js does.
loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  // Migrations need a direct connection, not the pooler.
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
