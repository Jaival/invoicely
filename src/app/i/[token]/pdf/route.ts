import { invoicePdfResponse } from '@/components/invoices/invoice-pdf'
import { getPublicInvoice } from '@/lib/invoices/queries'
import { getPublicAppearance } from '@/lib/organization'

// The PDF behind an invoice's public link; no sign-in, the token is the key.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const invoice = await getPublicInvoice(token)
  if (!invoice?.number) return new Response('Not found', { status: 404 })
  return invoicePdfResponse(
    invoice,
    await getPublicAppearance(invoice.organizationId),
  )
}
