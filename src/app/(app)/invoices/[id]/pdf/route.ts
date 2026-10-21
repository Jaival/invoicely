import { invoicePdfResponse } from '@/components/invoices/invoice-pdf'
import { getInvoice } from '@/lib/invoices/queries'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'

// Downloads a sent invoice as a PDF. Drafts have no number or captured
// details yet, so they have no PDF either.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [{ id }, organizationId] = await Promise.all([
    params,
    requireOrganizationId(),
  ])
  // Another organization's invoice is as missing as one that never existed.
  const invoice = isUuid(id) ? await getInvoice(organizationId, id) : undefined
  if (!invoice || invoice.status === 'draft' || !invoice.number) {
    return new Response('Not found', { status: 404 })
  }
  return invoicePdfResponse(invoice)
}
