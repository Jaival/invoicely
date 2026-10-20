import * as Sentry from '@sentry/nextjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { log } from '@/lib/logger'

vi.mock('@sentry/nextjs', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  captureException: vi.fn(),
}))
vi.mock('@/lib/sentry-environment', () => ({ sentryEnvironment: 'preview' }))

describe('log', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends attributes to Sentry and writes one JSON line', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    log.info('Invoice sent', { invoiceId: 'inv_1' })

    expect(Sentry.logger.info).toHaveBeenCalledWith('Invoice sent', {
      invoiceId: 'inv_1',
    })
    expect(JSON.parse(info.mock.calls[0][0])).toEqual({
      level: 'info',
      message: 'Invoice sent',
      invoiceId: 'inv_1',
    })
  })

  it('flattens a caught error and raises it as an issue', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new TypeError('boom')

    log.error('Could not send email', { subject: 'Hi', error })

    expect(Sentry.logger.error).toHaveBeenCalledWith(
      'Could not send email',
      expect.objectContaining({
        subject: 'Hi',
        error_type: 'TypeError',
        error_message: 'boom',
      }),
    )
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { log: 'Could not send email', subject: 'Hi' },
    })
  })

  it('wraps a non-Error value before raising it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    log.error('Resend failed', { error: { statusCode: 422 } })

    const [exception] = vi.mocked(Sentry.captureException).mock.lastCall!
    expect(exception).toBeInstanceOf(Error)
    expect((exception as Error).message).toBe('{"statusCode":422}')
  })

  it('drops debug entries outside local', () => {
    log.debug('noisy')
    expect(Sentry.logger.debug).not.toHaveBeenCalled()
  })
})
