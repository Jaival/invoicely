import { InvoicePdf } from '@/components/invoices/invoice-pdf'
import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'

const party = {
  name: 'Acme',
  email: 'billing@acme.test',
  taxId: null,
  addressLine1: 'Main St 1',
  addressLine2: null,
  city: 'Berlin',
  region: null,
  postalCode: '10115',
  country: 'DE',
}

const invoice = {
  id: '00000000-0000-4000-8000-000000000001',
  number: 'INV-0001',
  status: 'sent',
  currency: 'EUR',
  issueDate: '2026-10-01',
  dueDate: '2026-10-15',
  paidOn: null,
  notes: 'Thanks!',
  terms: null,
  businessDetails: { ...party, logoUrl: null },
  clientDetails: { ...party, name: 'Globex' },
  lines: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      description: 'Design work',
      quantity: 2000,
      unitPrice: 5000,
      taxRate: 1900,
      discountRate: 0,
    },
  ],
} as unknown as Parameters<typeof InvoicePdf>[0]['invoice']

describe('InvoicePdf', () => {
  it('renders a PDF document', async () => {
    const pdf = await renderToBuffer(InvoicePdf({ invoice }))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('embeds the Brutal fonts in the Brutal style', async () => {
    const pdf = await renderToBuffer(
      InvoicePdf({
        invoice,
        appearance: { style: 'brutal', palette: 'sunshine' },
      }),
    )
    const text = pdf.toString('latin1')
    expect(text).toContain('SpaceGrotesk')
    expect(text).toContain('JetBrainsMono')
  })
})
