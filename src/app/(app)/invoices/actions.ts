'use server'

import {
  createInvoice,
  deleteDraft,
  duplicateInvoice,
  getInvoice,
  markInvoicePaid,
  markInvoiceSent,
  markInvoiceUnpaid,
  recordInvoiceEmailed,
  updateDraft,
  voidInvoice,
} from '@/lib/invoices/queries'
import {
  invoiceSchema,
  issuesByPath,
  type InvoiceInput,
} from '@/lib/invoices/schema'
import { emailInvoice } from '@/lib/invoices/email'
import { paymentDateError } from '@/lib/invoices/status'
import { businessToday } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import { refresh } from 'next/cache'

export type InvoiceFormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  // Keyed by path, e.g. "lines.0.quantity".
  fieldErrors?: Record<string, string>
}

export type SendInvoiceState = InvoiceFormState & {
  // Set once sent.
  id?: string
  number?: string
  // The client's address, when the invoice was emailed to them.
  emailedTo?: string
}

const gone = 'This draft no longer exists or has already been sent.'

// Creates a draft, or updates one when given its id. The input comes from the
// browser, so it's parsed like any other untrusted value.
export async function saveInvoice(
  id: string | undefined,
  input: InvoiceInput,
): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  return save(organizationId, id, input)
}

// Saves the draft as it is in the editor, then sends it.
export async function sendInvoice(
  id: string | undefined,
  input: InvoiceInput,
): Promise<SendInvoiceState> {
  const organizationId = await requireOrganizationId()
  const saved = await save(organizationId, id, input)
  if (saved.status !== 'success' || !saved.id) return saved

  const number = await markInvoiceSent(organizationId, saved.id)
  if (!number) return { status: 'error', message: gone }
  const sent = await getInvoice(organizationId, saved.id)
  const emailedTo = sent && (await emailInvoice(sent))
  if (emailedTo) await recordInvoiceEmailed(organizationId, saved.id, emailedTo)
  return { status: 'success', id: saved.id, number, emailedTo }
}

// Copies an invoice into a new draft dated today.
export async function duplicate(
  id: string,
): Promise<InvoiceFormState & { id?: string }> {
  const organizationId = await requireOrganizationId()
  const created =
    isUuid(id) &&
    (await duplicateInvoice(
      organizationId,
      id,
      await businessToday(organizationId),
    ))
  if (!created) {
    return { status: 'error', message: 'This invoice no longer exists.' }
  }
  return { status: 'success', id: created }
}

export async function removeDraft(id: string): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await deleteDraft(organizationId, id))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success' }
}

export async function markPaid(
  id: string,
  paidOn: string,
): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  const error = paymentDateError(paidOn, await businessToday(organizationId))
  if (error) {
    return { status: 'error', message: error, fieldErrors: { paidOn: error } }
  }
  if (!isUuid(id) || !(await markInvoicePaid(organizationId, id, paidOn))) {
    return { status: 'error', message: 'This invoice isn’t awaiting payment.' }
  }
  refresh()
  return { status: 'success' }
}

export async function markUnpaid(id: string): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await markInvoiceUnpaid(organizationId, id))) {
    return { status: 'error', message: 'This invoice isn’t marked paid.' }
  }
  refresh()
  return { status: 'success' }
}

export async function markVoid(id: string): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await voidInvoice(organizationId, id))) {
    return {
      status: 'error',
      message: 'Only sent, unpaid invoices can be voided.',
    }
  }
  refresh()
  return { status: 'success' }
}

async function save(
  organizationId: string,
  id: string | undefined,
  input: InvoiceInput,
): Promise<InvoiceFormState & { id?: string }> {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: issuesByPath(parsed.error),
    }
  }

  if (!id) {
    const created = await createInvoice(organizationId, parsed.data)
    if (!created) {
      return {
        status: 'error',
        message: 'That client no longer exists.',
        fieldErrors: { clientId: 'Pick a client' },
      }
    }
    return { status: 'success', id: created }
  }
  if (!isUuid(id) || !(await updateDraft(organizationId, id, parsed.data))) {
    return { status: 'error', message: gone }
  }
  return { status: 'success', id }
}
