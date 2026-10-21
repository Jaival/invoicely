'use server'

import { env } from '@/env/server'
import {
  businessProfileSchema,
  detectLogoType,
  LOGO_MAX_BYTES,
} from '@/lib/business-profile'
import { log } from '@/lib/logger'
import { getBusinessProfile, upsertBusinessProfile } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { del, put } from '@vercel/blob'
import { refresh } from 'next/cache'
import * as z from 'zod'

export type BusinessProfileState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<string, string[]>>
}

const fields = Object.keys(businessProfileSchema.shape)

export async function saveBusinessProfile(
  _previous: BusinessProfileState,
  formData: FormData,
): Promise<BusinessProfileState> {
  const organizationId = await requireOrganizationId()

  const parsed = businessProfileSchema.safeParse(
    Object.fromEntries(
      fields.map((field) => [field, String(formData.get(field) ?? '')]),
    ),
  )
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    }
  }

  // undefined: keep the current logo. null: remove it.
  let logoUrl: string | null | undefined
  const logo = formData.get('logo')
  if (logo instanceof File && logo.size > 0) {
    const uploaded = await uploadLogo(organizationId, logo)
    if ('error' in uploaded) {
      return {
        status: 'error',
        message: uploaded.error,
        fieldErrors: { logo: [uploaded.error] },
      }
    }
    logoUrl = uploaded.url
  } else if (formData.get('removeLogo') === 'true') {
    logoUrl = null
  }

  const previous = await getBusinessProfile(organizationId)
  await upsertBusinessProfile(organizationId, {
    ...parsed.data,
    ...(logoUrl !== undefined && { logoUrl }),
  })

  // Clean up the replaced logo. A failure only leaves an orphaned file.
  if (logoUrl !== undefined && previous?.logoUrl) {
    await del(previous.logoUrl).catch((error) =>
      log.warn('Could not delete old logo', { organizationId, error }),
    )
  }

  refresh()
  return { status: 'success' }
}

async function uploadLogo(
  organizationId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return { error: 'Logo upload is not set up on this server.' }
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: 'Logos must be 512 KB or smaller.' }
  }
  const type = detectLogoType(
    new Uint8Array(await file.slice(0, 8).arrayBuffer()),
  )
  if (!type) {
    return { error: 'Upload a PNG or JPEG image.' }
  }

  const blob = await put(
    `logos/${organizationId}/logo.${type.extension}`,
    file,
    {
      access: 'public',
      addRandomSuffix: true,
      contentType: type.contentType,
    },
  )
  return { url: blob.url }
}
