import * as Sentry from '@sentry/nextjs'

import { env } from '@/env/client'
import { sentryEnvironment } from '@/lib/sentry-environment'

// Node.js runtime, loaded from instrumentation.ts.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment,
  tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,
})
