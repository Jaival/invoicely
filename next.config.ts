import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

import './src/env/client'
import './src/env/server'

const nextConfig: NextConfig = {}

export default withSentryConfig(nextConfig, {
  org: 'jaival',
  project: 'invoicely',
  // Uploads source maps on production builds. Without it, upload is skipped.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Sends browser events through the app so ad blockers don't drop them.
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
})
