import * as Sentry from '@sentry/nextjs'

import { env } from '@/env/client'
import { sentryEnvironment } from '@/lib/sentry-environment'

// Edge runtime, loaded from instrumentation.ts. The app has no edge code now;
// this keeps Sentry ready if some is added.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment,
  tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,
})
