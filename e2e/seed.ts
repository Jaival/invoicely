import { db } from '@/db'
import { member, user } from '@/db/schema'
import { createClient } from '@/lib/clients/queries'
import { addDays, today } from '@/lib/dates'
import {
  createInvoice,
  markInvoiceSent,
  recordPayment,
} from '@/lib/invoices/queries'
import { eq } from 'drizzle-orm'

// Sets up data for a test straight through the app's own queries, for tests
// about what's shown rather than how it's entered: going through the forms
// takes seconds per invoice. The test server's database (DATABASE_URL, from
// .env.local locally) must be the one the tests run against.

// The business of the user signed up with this email.
export async function businessOf(email: string) {
  const [found] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(user.email, email))
  if (!found) throw new Error(`No business for ${email}`)
  return found.organizationId
}

export async function seedClient(organizationId: string, name: string) {
  return createClient(organizationId, {
    name,
    email: null,
    taxId: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    notes: null,
  })
}

// An invoice with one line of `amount` (minor units), dated today in UTC
// and due 30 days later unless dates are given, sent unless it's a draft.
export async function seedInvoice(
  organizationId: string,
  clientId: string,
  amount: number,
  {
    currency = 'USD',
    issueDate = today(),
    dueDate = addDays(issueDate, 30),
    draft = false,
  }: {
    currency?: string
    issueDate?: string
    dueDate?: string
    draft?: boolean
  } = {},
) {
  const id = await createInvoice(organizationId, {
    clientId,
    currency,
    issueDate,
    dueDate,
    notes: null,
    terms: null,
    lines: [
      {
        description: 'Work',
        quantity: 1000,
        unitPrice: amount,
        taxRate: 0,
        discountRate: 0,
      },
    ],
  })
  if (!id) throw new Error('Invoice was not created')
  if (!draft) await markInvoiceSent(organizationId, id)
  return id
}

// A bank transfer received today in UTC.
export async function seedPayment(
  organizationId: string,
  invoiceId: string,
  amount: number,
) {
  const result = await recordPayment(organizationId, invoiceId, {
    amount,
    receivedOn: today(),
    method: 'bank_transfer',
    reference: null,
  })
  if (!result) throw new Error('Payment was not recorded')
}
