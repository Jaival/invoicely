'use server'

import {
  createInvoice,
  deleteDraft,
  duplicateInvoice,
  getInvoice,
  markInvoiceSent,
  recordInvoiceEmailed,
  recordPayment,
  removePayment,
  updateDraft,
  voidInvoice,
} from '@/lib/invoices/queries'
import {
  invoiceSchema,
  issuesByPath,
  type InvoiceInput,
} from '@/lib/invoices/schema'
import { emailInvoice } from '@/lib/invoices/email'
import { parsePayment, type PaymentInput } from '@/lib/invoices/payments'
import { invoiceTotals } from '@/lib/money'
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
  // Saved, so it parses. The draft is kept either way.
  const { lines } = invoiceSchema.parse(input)
  if (!invoiceTotals(lines)?.total) {
    return {
      status: 'error',
      message: 'There’s nothing to pay on this invoice yet.',
      id: saved.id,
    }
  }

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

// Records money received against an invoice awaiting payment.
export async function addPayment(
  id: string,
  input: PaymentInput,
): Promise<InvoiceFormState & { paid?: boolean }> {
  const organizationId = await requireOrganizationId()
  const notOwed = 'This invoice isn’t awaiting payment.'
  const owed = isUuid(id) ? await getInvoice(organizationId, id) : undefined
  if (owed?.status !== 'sent') return { status: 'error', message: notOwed }

  const parsed = parsePayment(
    input,
    { currency: owed.currency, balance: owed.total - owed.amountPaid },
    await businessToday(organizationId),
  )
  if (parsed.fieldErrors) {
    return {
      status: 'error',
      message: 'Check the highlighted fields.',
      fieldErrors: parsed.fieldErrors,
    }
  }
  const result = await recordPayment(organizationId, id, parsed.values)
  if (!result) return { status: 'error', message: notOwed }
  if (result === 'too_much') {
    // Another payment arrived since the form opened.
    return {
      status: 'error',
      message: 'That’s more than is left to pay now.',
      fieldErrors: { amount: 'That’s more than is left to pay' },
    }
  }
  refresh()
  return { status: 'success', paid: result === 'paid' }
}

export async function deletePayment(
  paymentId: string,
): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(paymentId) || !(await removePayment(organizationId, paymentId))) {
    return { status: 'error', message: 'This payment was already removed.' }
  }
  refresh()
  return { status: 'success' }
}

export async function markVoid(id: string): Promise<InvoiceFormState> {
  const organizationId = await requireOrganizationId()
  if (!isUuid(id) || !(await voidInvoice(organizationId, id))) {
    return {
      status: 'error',
      message: 'Only invoices with nothing paid can be voided.',
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
