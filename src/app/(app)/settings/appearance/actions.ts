'use server'

import { appearanceSchema, type Appearance } from '@/lib/appearance'
import { auth } from '@/lib/auth'
import { requireSession } from '@/lib/session'
import { refresh } from 'next/cache'

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
  // The root layout applies the style; render it again.
  refresh()
  return {}
}
