'use server'

import { createInvoice, deleteDraft, updateDraft } from '@/lib/invoices/queries'
import {
  invoiceSchema,
  issuesByPath,
  type InvoiceInput,
} from '@/lib/invoices/schema'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'

export type InvoiceFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  // Keyed by path, e.g. "lines.0.quantity".
  fieldErrors?: Record<string, string>
}

const gone = 'This draft no longer exists or has already been sent.'

// Creates a draft, or updates one when given its id. The input comes from the
// browser, so it's parsed like any other untrusted value.
export async function saveInvoice(
  id: string | undefined,
  input: InvoiceInput,
): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()

  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: issuesByPath(parsed.error),
    }
  }

  if (!id) {
    if (!(await createInvoice(organizationId, parsed.data))) {
      return {
        status: 'error',
        message: 'That client no longer exists.',
        fieldErrors: { clientId: 'Pick a client' },
      }
    }
    return { status: 'success' }
  }
  if (!isUuid(id) || !(await updateDraft(organizationId, id, parsed.data))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success' }
}

export async function removeDraft(id: string): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await deleteDraft(organizationId, id))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success' }
}
