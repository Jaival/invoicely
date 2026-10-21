import { renderInvoicePdf } from '@/components/invoices/invoice-pdf'
import { NewInvoiceEmail } from '@/emails/new-invoice'
import { env } from '@/env/client'
import { emailEnabled, sendEmail } from '@/lib/email/send'
import { formatDate } from '@/lib/dates'
import type { getInvoice } from '@/lib/invoices/queries'
import { log } from '@/lib/logger'
import { formatMoney } from '@/lib/money'

type SentInvoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>

// Emails a sent invoice to its client: a link to the public view, with the
// PDF attached. Resolves to the address it went to, or undefined when it
// didn't go: email is off, the client has no address, or delivery failed.
// The invoice stays sent either way; the business can share the link.
export async function emailInvoice(invoice: SentInvoice) {
  const to = invoice.clientDetails?.email
  const business = invoice.businessDetails
  if (!emailEnabled || !to || !invoice.number || !invoice.publicToken) {
    return undefined
  }

  try {
    const businessName = business?.name ?? 'Your supplier'
    const sent = await sendEmail({
      to,
      subject: `Invoice ${invoice.number} from ${businessName}`,
      replyTo: business?.email ?? undefined,
      react: (
        <NewInvoiceEmail
          businessName={businessName}
          number={invoice.number}
          amount={formatMoney(invoice.total, invoice.currency)}
          dueDate={formatDate(invoice.dueDate)}
          url={
            new URL(`/i/${invoice.publicToken}`, env.NEXT_PUBLIC_APP_URL).href
          }
        />
      ),
      attachments: [
        {
          filename: `${invoice.number}.pdf`,
          content: await renderInvoicePdf(invoice),
        },
      ],
    })
    return sent ? to : undefined
  } catch (error) {
    log.error('Could not email invoice', { id: invoice.id, error })
    return undefined
  }
}
