import { createEnv } from '@t3-oss/env-nextjs'
import { vercel } from '@t3-oss/env-nextjs/presets-zod'
import * as z from 'zod'

// Server-only variables. Reading one from client code throws at runtime.
export const env = createEnv({
  server: {},
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
