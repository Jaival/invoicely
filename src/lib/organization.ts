import { db } from '@/db'
import { businessProfile, member, organization, user } from '@/db/schema'
import type { BusinessProfileValues } from '@/lib/business-profile'
import { today } from '@/lib/dates'
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
export const getActiveOrganization = cache(async (organizationId: string) => {
  const [active] = await db
    .select({ id: organization.id, name: organization.name })
    .from(organization)
    .where(eq(organization.id, organizationId))
  return active
})

// The details printed on the organization's invoices, if it has set them up.
export const getBusinessProfile = cache(async (organizationId: string) => {
  const [profile] = await db
    .select()
    .from(businessProfile)
    .where(eq(businessProfile.organizationId, organizationId))
  return profile
})

// Creates or replaces the organization's business profile. A logoUrl left
// out keeps the current logo; null removes it. The business name is the
// organization's name everywhere else too.
export async function upsertBusinessProfile(
  organizationId: string,
  values: BusinessProfileValues & { logoUrl?: string | null },
) {
  await db.transaction(async (tx) => {
    await tx
      .insert(businessProfile)
      .values({ organizationId, ...values })
      .onConflictDoUpdate({
        target: businessProfile.organizationId,
        set: { ...values, updatedAt: new Date() },
      })
    await tx
      .update(organization)
      .set({ name: values.name })
      .where(eq(organization.id, organizationId))
  })
}

// Today's date where the business is, for default dates and overdue checks.
export async function businessToday(organizationId: string) {
  const profile = await getBusinessProfile(organizationId)
  return today(profile?.timeZone ?? undefined)
}
