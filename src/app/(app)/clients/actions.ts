'use server'

import { createClient, deleteClient, updateClient } from '@/lib/clients/queries'
import { clientSchema } from '@/lib/clients/schema'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import * as z from 'zod'

export type ClientFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: Partial<Record<string, string[]>>
}

const fields = Object.keys(clientSchema.shape)
const gone = 'This client no longer exists.'

// Creates a client, or updates one when the form carries its id.
export async function saveClient(
  _previous: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const organizationId = await requireOrganizationId()

  const parsed = clientSchema.safeParse(
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

  const id = String(formData.get('id') ?? '')
  if (!id) {
    await createClient(organizationId, parsed.data)
    return { status: 'success' }
  }
  if (!isUuid(id) || !(await updateClient(organizationId, id, parsed.data))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success' }
}

export async function removeClient(id: string): Promise<ClientFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await deleteClient(organizationId, id))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success' }
}
