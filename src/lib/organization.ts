import { db } from '@/db'
import { businessProfile, member, organization, user } from '@/db/schema'
import { organizationSlug } from '@/lib/slug'
import { asc, eq } from 'drizzle-orm'
import { cache } from 'react'

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

// The organization the session is working in. Cached per request so the
// layout and page can both ask for it.
export const getActiveOrganization = cache(
  async (organizationId: string | null | undefined) => {
    if (!organizationId) return undefined
    const [active] = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, organizationId))
    return active
  },
)

// The details printed on the organization's invoices, if it has set them up.
export const getBusinessProfile = cache(async (organizationId: string) => {
  const [profile] = await db
    .select()
    .from(businessProfile)
    .where(eq(businessProfile.organizationId, organizationId))
  return profile
})
