import { db } from '@/db'
import * as schema from '@/db/schema'
import { env as clientEnv } from '@/env/client'
import { env } from '@/env/server'
import { ResetPasswordEmail } from '@/emails/reset-password'
import { VerifyEmail } from '@/emails/verify-email'
import { defaultAppearance, palettes, styles } from '@/lib/appearance'
import { emailEnabled, sendEmail } from '@/lib/email/send'
import { log } from '@/lib/logger'
import { ensurePersonalOrganization } from '@/lib/organization'
import { waitUntil } from '@vercel/functions'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { oAuthProxy, organization } from 'better-auth/plugins'

// Preview deployments get a new URL each time, which Google won't accept as a
// redirect URI. On Vercel, the OAuth proxy sends previews through the
// production callback and hands the profile back to the preview.
const productionURL = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined
const useOAuthProxy = !!(env.VERCEL && productionURL && env.OAUTH_PROXY_SECRET)

export const googleEnabled = !!(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
)

export const auth = betterAuth({
  appName: 'Invoicely',
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  advanced: { database: { generateId: 'uuid' } },
  user: {
    // Read with userAppearance(), saved by the appearance settings action.
    additionalFields: {
      uiStyle: {
        type: [...styles],
        required: false,
        defaultValue: defaultAppearance.style,
        input: false,
      },
      uiPalette: {
        type: [...palettes],
        required: false,
        defaultValue: defaultAppearance.palette,
        input: false,
      },
    },
  },
  // Better Auth passes the error, if any, as an argument or under `error`.
  logger: {
    log: (level, message, ...args) => {
      const error = args
        .map((arg) => (arg instanceof Error ? arg : arg?.error))
        .find((arg) => arg instanceof Error)
      log[level](message, { source: 'better-auth', ...(error && { error }) })
    },
  },
  // Production plus every branch and deployment URL of this project. The
  // `-jaival-projects` scope suffix keeps other Vercel accounts' apps out.
  // Production must trust previews for the OAuth proxy round trip.
  trustedOrigins: env.VERCEL
    ? [productionURL, 'https://invoicely-*-jaival-projects.vercel.app'].filter(
        (origin) => origin !== undefined,
      )
    : [],
  emailAndPassword: {
    enabled: true,
    // Only once emails can be delivered; otherwise nobody could sign up.
    requireEmailVerification: emailEnabled,
    revokeSessionsOnPasswordReset: true,
    // Sent in the background so response time doesn't reveal whether the
    // account exists.
    sendResetPassword: async ({ user, url }) => {
      waitUntil(
        sendEmail({
          to: user.email,
          subject: 'Reset your Invoicely password',
          react: ResetPasswordEmail({ name: user.name, url }),
        }),
      )
    },
  },
  emailVerification: {
    sendOnSignUp: emailEnabled,
    // Signing in unverified sends a fresh link.
    sendOnSignIn: emailEnabled,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      waitUntil(
        sendEmail({
          to: user.email,
          subject: 'Confirm your email for Invoicely',
          react: VerifyEmail({ name: user.name, url }),
        }),
      )
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  databaseHooks: {
    session: {
      create: {
        // Solo-first tenancy: every user works inside their own organization,
        // created on first sign-in and active on every session.
        before: async (session) => {
          const organizationId = await ensurePersonalOrganization(
            session.userId,
          )
          return { data: { ...session, activeOrganizationId: organizationId } }
        },
      },
    },
  },
  plugins: [
    organization(),
    ...(useOAuthProxy
      ? [oAuthProxy({ productionURL, secret: env.OAUTH_PROXY_SECRET })]
      : []),
    // nextCookies must stay last.
    nextCookies(),
  ],
})

export { emailEnabled }

export type Session = typeof auth.$Infer.Session
