import { existsSync } from 'node:fs'

// Database tests need DATABASE_URL. Next.js skips .env.local when NODE_ENV
// is "test", so load it here; CI sets the variables directly instead.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
