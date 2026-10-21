import { env } from '@/env/server'
import { log } from '@/lib/logger'
import { render } from '@react-email/components'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'

// Email that depends on delivery (verification, password reset) is only
// turned on when something can actually deliver it.
export const emailEnabled = !!(env.RESEND_API_KEY || env.EMAIL_OUTBOX_DIR)

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

type Email = {
  to: string
  subject: string
  react: React.ReactElement
  // Where replies go instead of EMAIL_FROM, e.g. the business that billed.
  replyTo?: string
  attachments?: { filename: string; content: Buffer }[]
}

// Resolves to whether the email was handed over for delivery (or written to
// the outbox). Failures are logged, never thrown.
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  attachments,
}: Email) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ])

  if (env.EMAIL_OUTBOX_DIR) {
    // Tests read these files instead of a real inbox.
    await mkdir(env.EMAIL_OUTBOX_DIR, { recursive: true })
    const file = `${Date.now()}-${crypto.randomUUID()}.json`
    await writeFile(
      path.join(env.EMAIL_OUTBOX_DIR, file),
      JSON.stringify({
        to,
        subject,
        replyTo,
        html,
        text,
        attachments: attachments?.map(({ filename, content }) => ({
          filename,
          size: content.length,
        })),
      }),
    )
    return true
  }

  if (!resend) {
    log.warn('Email not sent: no RESEND_API_KEY', { subject })
    return false
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
    attachments,
  })
  if (error) {
    log.error('Could not send email', { subject, error })
    return false
  }
  return true
}
