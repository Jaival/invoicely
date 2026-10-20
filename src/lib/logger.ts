import * as Sentry from '@sentry/nextjs'

import { sentryEnvironment } from '@/lib/sentry-environment'

type Level = 'debug' | 'info' | 'warn' | 'error'
type Attributes = Record<string, unknown>

const local = sentryEnvironment === 'local'

// Server logging. Each entry goes to Sentry Logs, linked to the current
// trace, and to stdout for Vercel's runtime logs: one JSON line when
// deployed, a readable line locally. Debug entries stay local.
function write(level: Level, message: string, attributes: Attributes = {}) {
  if (level === 'debug' && !local) return

  const { error, ...rest } = attributes
  const fields = error === undefined ? rest : { ...rest, ...errorFields(error) }

  Sentry.logger[level](message, fields)
  // A caught error never reaches onRequestError, so raise it as an issue.
  if (level === 'error' && error !== undefined) {
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(fields.error_message)),
      { extra: { log: message, ...rest } },
    )
  }

  if (local) {
    console[level](
      message,
      ...(Object.keys(attributes).length ? [attributes] : []),
    )
  } else {
    console[level](JSON.stringify({ level, message, ...fields }))
  }
}

function errorFields(error: unknown): Attributes {
  if (error instanceof Error) {
    return {
      error_type: error.name,
      error_message: error.message,
      error_stack: error.stack,
    }
  }
  return {
    error_message:
      typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : String(error),
  }
}

// Pass a caught error as `error`; it is flattened into error_* fields.
export const log = {
  debug: (message: string, attributes?: Attributes) =>
    write('debug', message, attributes),
  info: (message: string, attributes?: Attributes) =>
    write('info', message, attributes),
  warn: (message: string, attributes?: Attributes) =>
    write('warn', message, attributes),
  error: (message: string, attributes?: Attributes) =>
    write('error', message, attributes),
}
