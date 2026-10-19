import { db } from '@/db'
import * as schema from '@/db/schema'
import { env as clientEnv } from '@/env/client'
import { env } from '@/env/server'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { organization } from 'better-auth/plugins'

export const auth = betterAuth({
  appName: 'Invoicely',
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  advanced: { database: { generateId: 'uuid' } },
  emailAndPassword: { enabled: true },
  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  // nextCookies must stay last.
  plugins: [organization(), nextCookies()],
})
