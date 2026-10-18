import { createEnv } from '@t3-oss/env-nextjs'
import * as z from 'zod'

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})
