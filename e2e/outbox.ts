import { expect } from '@playwright/test'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

// The test server writes every email here (EMAIL_OUTBOX_DIR) instead of
// sending it. Each test uses its own address, so tests never read each
// other's mail.
export const outboxDir = path.join(__dirname, '..', '.email-outbox')

type OutboxEmail = { to: string; subject: string; html: string; text: string }

async function emailsTo(to: string) {
  const files = await readdir(outboxDir).catch(() => [])
  const emails = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .sort()
      .map(async (file) => {
        const content = await readFile(path.join(outboxDir, file), 'utf8')
        return JSON.parse(content) as OutboxEmail
      }),
  )
  return emails.filter((email) => email.to === to)
}

// Waits for the `count`-th email to `to` whose subject matches, and returns
// the first link in it.
export async function linkFromEmail(to: string, subject: RegExp, count = 1) {
  let matching: OutboxEmail[] = []
  await expect
    .poll(
      async () => {
        matching = (await emailsTo(to)).filter((email) =>
          subject.test(email.subject),
        )
        return matching.length
      },
      { message: `waiting for email ${count} to ${to}`, timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(count)

  const link = matching[count - 1].text.match(/https?:\/\/[^\s\])]+/)?.[0]
  expect(link, 'email contains a link').toBeTruthy()
  return link!
}
