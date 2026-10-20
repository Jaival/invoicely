import { createEnv } from '@t3-oss/env-nextjs'
import { vercel } from '@t3-oss/env-nextjs/presets-zod'
import * as z from 'zod'

// Server-only variables. Reading one from client code throws at runtime.
export const env = createEnv({
  server: {
    // Neon: production branch on Vercel Production, shared dev branch on
    // Preview and locally. Pooled, for the app.
    DATABASE_URL: z.url(),
    // Direct, for migrations. Falls back to DATABASE_URL (e.g. local Postgres).
    DATABASE_URL_UNPOOLED: z.url().optional(),
    // Signs sessions and tokens. Generate with `openssl rand -base64 32`.
    BETTER_AUTH_SECRET: z.string().min(32),
    // Google sign-in. Optional until the OAuth client exists.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Shared by production and previews so Google sign-in works on previews.
    // Only used on Vercel. Generate with `openssl rand -base64 32`.
    OAUTH_PROXY_SECRET: z.string().min(32).optional(),
    // Vercel Blob, for business logos. Added by connecting the Blob store to
    // the project. Without it, logo upload is turned off.
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    // Resend, for verification and password reset emails. Without it (or an
    // outbox), email verification and password reset are turned off.
    RESEND_API_KEY: z.string().optional(),
    // Sender, on a domain verified in Resend.
    EMAIL_FROM: z.string().default('Invoicely <onboarding@resend.dev>'),
    // Tests only: write emails as JSON files here instead of sending them.
    EMAIL_OUTBOX_DIR: z.string().optional(),
  },
  shared: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },
  extends: [vercel()],
  experimental__runtimeEnv: process.env,
  // Set SKIP_ENV_VALIDATION=1 when building without secrets (e.g. Docker images).
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
