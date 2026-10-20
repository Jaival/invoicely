import { db } from '@/db'
import { businessProfile, client, organization } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { afterAll } from 'vitest'

// Organizations created by a test file, deleted (with everything they own)
// once its tests finish.
const created: string[] = []

afterAll(async () => {
  if (created.length > 0) {
    await db.delete(organization).where(inArray(organization.id, created))
  }
  await db.$client.end()
})

export async function createOrganization(invoicePrefix?: string) {
  const [org] = await db
    .insert(organization)
    .values({
      name: 'Test business',
      slug: `test-${randomUUID()}`,
      createdAt: new Date(),
    })
    .returning({ id: organization.id })
  created.push(org.id)
  if (invoicePrefix) {
    await db
      .insert(businessProfile)
      .values({ organizationId: org.id, name: 'Test business', invoicePrefix })
  }
  return org.id
}

export async function createClient(organizationId: string) {
  const [created] = await db
    .insert(client)
    .values({ organizationId, name: 'Test client' })
    .returning({ id: client.id })
  return created.id
}
