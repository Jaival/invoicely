import { loudSticker } from '@/components/app/page-title'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status'
import { InvoiceDocument } from '@/components/invoices/invoice-view'
import { PrintButton } from '@/components/invoices/print-button'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { today } from '@/lib/dates'
import { getPublicInvoice } from '@/lib/invoices/queries'
import { displayStatus } from '@/lib/invoices/status'
import { appearanceScope } from '@/lib/appearance'
import { getBusinessProfile, getPublicAppearance } from '@/lib/organization'
import { Download } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

type Props = { params: Promise<{ token: string }> }

// Shared by the metadata and the page, so the invoice is read once.
const findInvoice = cache(getPublicInvoice)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const invoice = await findInvoice((await params).token)
  return {
    title: invoice?.number ? `Invoice ${invoice.number}` : 'Invoice',
    // The link is a secret: keep it out of search results, and out of the
    // Referer header sent when loading the business's logo.
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  }
}

// An invoice as its client sees it, opened from the link the business
// shared. No sign-in: the unguessable token in the URL is the key. Printed,
// it's just the invoice: no buttons, card or footer.
export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params
  const invoice = await findInvoice(token)
  if (!invoice?.number) notFound()

  const [profile, appearance] = await Promise.all([
    getBusinessProfile(invoice.organizationId),
    getPublicAppearance(invoice.organizationId),
  ])
  const timeZone = profile?.timeZone ?? 'UTC'
  const status = displayStatus(invoice, today(timeZone))
  const from = invoice.businessDetails?.name

  return (
    // In the business's style, whatever the visitor's own: a signed-in
    // visitor's page is in theirs.
    <div
      {...appearanceScope(appearance)}
      className="min-h-screen bg-background text-foreground print:min-h-0 loud:bg-dots"
    >
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6 print:min-h-0 print:max-w-none print:p-0">
        <Card className="print:border-0 print:py-0 print:shadow-none">
          <CardHeader className="flex flex-wrap items-start justify-between gap-4 print:px-0">
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <h1 className={loudSticker}>Invoice {invoice.number}</h1>
                <InvoiceStatusBadge status={status} />
              </CardTitle>
              {from && <CardDescription>From {from}</CardDescription>}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <PrintButton />
              <Button variant="outline" asChild>
                <a href={`/i/${token}/pdf`} download>
                  <Download />
                  Download PDF
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="print:px-0">
            <InvoiceDocument invoice={invoice} timeZone={timeZone} />
          </CardContent>
        </Card>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground print:hidden">
          <Logo className="size-4" />
          Sent with Invoicely
        </p>
      </main>
    </div>
  )
}
