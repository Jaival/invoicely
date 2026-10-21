import { auth } from '@/lib/auth'
import { ensurePersonalOrganization } from '@/lib/organization'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// One session lookup per request, however many components ask for it.
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
)

// For pages that need a signed-in user. The proxy only checks that a session
// cookie exists; this validates it against the database.
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  return session
}

// The organization the signed-in user works in. Every session gets one when
// it's created, but Better Auth clears it when the user asks its API about
// an organization they don't belong to; then they work in their own.
export const requireOrganizationId = cache(async () => {
  const { user, session } = await requireSession()
  return session.activeOrganizationId ?? ensurePersonalOrganization(user.id)
})
