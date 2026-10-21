import type { PartyDetails } from '@/db/schema'
import { formatDate } from '@/lib/dates'
import type { getInvoice } from '@/lib/invoices/queries'
import { partyLines } from '@/lib/invoices/party'
import {
  formatMoney,
  formatQuantity,
  formatRate,
  invoiceTotals,
  lineAmounts,
} from '@/lib/money'
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

type InvoicePdfProps = {
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoice>>>
}

// The brand's emerald and neutral greys; PDFs can't read the CSS theme.
const colors = { accent: '#059669', muted: '#737373', border: '#e5e5e5' }

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#171717',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  logo: { maxWidth: 120, maxHeight: 48, objectFit: 'contain' },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: colors.accent },
  number: { fontSize: 12, marginTop: 4, textAlign: 'right' },
  parties: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  column: { flex: 1 },
  label: { color: colors.muted, marginBottom: 2 },
  bold: { fontFamily: 'Helvetica-Bold' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  headRow: { borderBottomColor: '#171717', color: colors.muted },
  description: { flex: 1, paddingRight: 8 },
  cell: { width: 64, textAlign: 'right' },
  wideCell: { width: 84, textAlign: 'right' },
  totals: { marginLeft: 'auto', width: 220, marginTop: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#171717',
    marginTop: 6,
    paddingTop: 6,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  notes: { flexDirection: 'row', gap: 24, marginTop: 32 },
})

// A sent invoice as a printable A4 document, from the details captured
// when it was sent.
export function InvoicePdf({ invoice }: InvoicePdfProps) {
  const money = (minor: number) => formatMoney(minor, invoice.currency)
  const percent = (rate: number) => (rate ? `${formatRate(rate)}%` : '—')
  const totals = invoiceTotals(invoice.lines)
  const business = invoice.businessDetails
  const dates: [string, string][] = [
    ['Issued', formatDate(invoice.issueDate)],
    ['Due', formatDate(invoice.dueDate)],
  ]
  if (invoice.paidOn) dates.push(['Paid', formatDate(invoice.paidOn)])

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author={business?.name}
      creator="Invoicely"
      producer="Invoicely"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {business?.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- PDF images have no alt text
            <Image src={business.logoUrl} style={styles.logo} />
          ) : (
            <Text style={styles.bold}>{business?.name}</Text>
          )}
          <View>
            <Text style={styles.title}>
              {invoice.status === 'void' ? 'VOID INVOICE' : 'INVOICE'}
            </Text>
            <Text style={styles.number}>{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          {business && <Party heading="From" details={business} />}
          {invoice.clientDetails && (
            <Party heading="Bill to" details={invoice.clientDetails} />
          )}
          <View style={styles.column}>
            {dates.map(([label, value]) => (
              <View key={label} style={styles.dateRow}>
                <Text style={{ color: colors.muted }}>{label}</Text>
                <Text>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.row, styles.headRow]} fixed>
          <Text style={styles.description}>Description</Text>
          <Text style={styles.cell}>Quantity</Text>
          <Text style={styles.wideCell}>Unit price</Text>
          <Text style={styles.cell}>Tax</Text>
          <Text style={styles.cell}>Discount</Text>
          <Text style={styles.wideCell}>Amount</Text>
        </View>
        {invoice.lines.map((line) => (
          <View key={line.id} style={styles.row} wrap={false}>
            <Text style={styles.description}>{line.description}</Text>
            <Text style={styles.cell}>{formatQuantity(line.quantity)}</Text>
            <Text style={styles.wideCell}>{money(line.unitPrice)}</Text>
            <Text style={styles.cell}>{percent(line.taxRate)}</Text>
            <Text style={styles.cell}>{percent(line.discountRate)}</Text>
            <Text style={styles.wideCell}>{money(lineAmounts(line).net)}</Text>
          </View>
        ))}

        {totals && (
          <View style={styles.totals} wrap={false}>
            <TotalRow label="Subtotal" value={money(totals.subtotal)} />
            {totals.discount > 0 && (
              <TotalRow label="Discount" value={money(-totals.discount)} />
            )}
            {totals.taxes
              .filter((group) => group.rate)
              .map((group) => (
                <TotalRow
                  key={group.rate}
                  label={`Tax ${formatRate(group.rate)}%`}
                  value={money(group.tax)}
                />
              ))}
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text>Total</Text>
              <Text>{money(totals.total)}</Text>
            </View>
          </View>
        )}

        {(invoice.notes || invoice.terms) && (
          <View style={styles.notes} wrap={false}>
            {invoice.notes && <Note heading="Notes" text={invoice.notes} />}
            {invoice.terms && <Note heading="Terms" text={invoice.terms} />}
          </View>
        )}
      </Page>
    </Document>
  )
}

// Called directly: renderToBuffer wants the <Document> element itself.
export const renderInvoicePdf = (invoice: InvoicePdfProps['invoice']) =>
  renderToBuffer(InvoicePdf({ invoice }))

// The invoice's PDF as a download named after its number. Only sent
// invoices have a number and the captured details the PDF prints.
export async function invoicePdfResponse(invoice: InvoicePdfProps['invoice']) {
  const pdf = await renderInvoicePdf(invoice)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

function Party({
  heading,
  details,
}: {
  heading: string
  details: PartyDetails
}) {
  return (
    <View style={styles.column}>
      <Text style={styles.label}>{heading}</Text>
      <Text style={styles.bold}>{details.name}</Text>
      {partyLines(details).map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text>{value}</Text>
    </View>
  )
}

function Note({ heading, text }: { heading: string; text: string }) {
  return (
    <View style={styles.column}>
      <Text style={styles.label}>{heading}</Text>
      <Text>{text}</Text>
    </View>
  )
}
