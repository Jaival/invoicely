import { db } from '@/db'
import { member, organization, user } from '@/db/schema'
import { organizationSlug } from '@/lib/slug'
import { asc, eq } from 'drizzle-orm'

// Returns the user's first organization, creating one they own if they have
// none yet (i.e. on their first sign-in).
export async function ensurePersonalOrganization(userId: string) {
  const [existing] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1)
  if (existing) return existing.organizationId

  return db.transaction(async (tx) => {
    const [owner] = await tx
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
    const name = owner?.name.trim() || 'My business'
    const now = new Date()

    const [created] = await tx
      .insert(organization)
      .values({ name, slug: organizationSlug(name), createdAt: now })
      .returning({ id: organization.id })
    await tx.insert(member).values({
      organizationId: created.id,
      userId,
      role: 'owner',
      createdAt: now,
    })
    return created.id
  })
}
