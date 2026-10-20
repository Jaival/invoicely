import { auth } from '@/lib/auth'
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
// it's created, so a session without one is stale.
export async function requireOrganizationId() {
  const { session } = await requireSession()
  if (!session.activeOrganizationId) redirect('/sign-in')
  return session.activeOrganizationId
}
