'use server'

import { appearanceSchema, type Appearance } from '@/lib/appearance'
import { auth } from '@/lib/auth'
import { requireSession } from '@/lib/session'
import { headers } from 'next/headers'

export async function saveAppearance(
  values: Appearance,
): Promise<{ error?: string }> {
  const { user } = await requireSession()
  const parsed = appearanceSchema.safeParse(values)
  if (!parsed.success) return { error: 'Choose a style and a palette.' }

  // The fields aren't open to Better Auth's update-user endpoint, so they're
  // saved through its adapter, which only this server can reach.
  const { internalAdapter } = await auth.$context
  await internalAdapter.updateUser(user.id, {
    uiStyle: parsed.data.style,
    uiPalette: parsed.data.palette,
    uiStrength: parsed.data.strength,
  })
  // Read straight from the database, which re-writes the cached session
  // cookie. getSession() would return the memoized stale value. The picker
  // then refreshes the page in a new request, so the root layout reads the
  // new cookie; a refresh() here would still see the old one.
  await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  })
  return {}
}
