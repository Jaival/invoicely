import * as Sentry from '@sentry/nextjs'

import { env } from '@/env/client'
import { sentryEnvironment } from '@/lib/sentry-environment'

// Browser runtime. Without a DSN, Sentry stays off.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment,
  tracesSampleRate: env.NODE_ENV === 'development' ? 1.0 : 0.1,
  // Record 10% of sessions and every session that hits an error. Replay
  // masks all text and inputs by default, which keeps invoice data out.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
