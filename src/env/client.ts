import { createEnv } from '@t3-oss/env-nextjs'
import * as z from 'zod'

// On Vercel, fall back to the deployment's own domain so preview links point
// at the preview and production links at the production domain.
function vercelAppUrl() {
  const host =
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
      ? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      : process.env.NEXT_PUBLIC_VERCEL_URL
  return host ? `https://${host}` : undefined
}

// Public variables, safe to use anywhere. Each must be listed in runtimeEnv
// so Next.js inlines it into the client bundle.
export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  },
  shared: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || vercelAppUrl(),
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
