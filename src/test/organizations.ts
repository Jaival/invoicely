import { db } from '@/db'
import {
  businessProfile,
  client,
  member,
  organization,
  user,
} from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { afterAll } from 'vitest'

// Organizations and users created by a test file, deleted (with everything
// they own) once its tests finish.
const created: string[] = []
const users: string[] = []

afterAll(async () => {
  if (users.length > 0) {
    // Including the organizations created for them on first sign-in.
    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(inArray(member.userId, users))
    created.push(...memberships.map((row) => row.organizationId))
    await db.delete(user).where(inArray(user.id, users))
  }
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

export async function createUser(name = 'Test user') {
  const [created] = await db
    .insert(user)
    .values({ name, email: `test-${randomUUID()}@example.com` })
    .returning({ id: user.id })
  users.push(created.id)
  return created.id
}
