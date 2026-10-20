'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

// Replaces the root layout when it throws, so it renders its own html and
// body. Error boundaries catch errors before Sentry sees them, hence the
// manual capture.
export default function GlobalError({ error }: { error: unknown }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
