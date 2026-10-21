import { InvoicePdf } from '@/components/invoices/invoice-pdf'
import { getInvoice } from '@/lib/invoices/queries'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import { renderToBuffer } from '@react-pdf/renderer'

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

  // Called directly: renderToBuffer wants the <Document> element itself.
  const pdf = await renderToBuffer(InvoicePdf({ invoice }))
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
