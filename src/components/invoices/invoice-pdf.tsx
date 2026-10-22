import type { PartyDetails } from '@/db/schema'
import {
  defaultAppearance,
  type Appearance,
  type Palette,
} from '@/lib/appearance'
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
  Font,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import path from 'node:path'

type InvoicePdfProps = {
  invoice: NonNullable<Awaited<ReturnType<typeof getInvoice>>>
  // The business's public style; Clean unless it matches the owner's.
  appearance?: Appearance
}

// Embedded for the Brutal style; Clean uses the PDF's built-in Helvetica.
// next.config.ts ships the folder with the routes that render PDFs.
const fonts = path.join(process.cwd(), 'src/components/invoices/fonts')
Font.register({
  family: 'Space Grotesk',
  src: path.join(fonts, 'SpaceGrotesk-Bold.ttf'),
})
Font.register({
  family: 'JetBrains Mono',
  fonts: [
    { src: path.join(fonts, 'JetBrainsMono-Regular.ttf') },
    { src: path.join(fonts, 'JetBrainsMono-Bold.ttf'), fontWeight: 'bold' },
  ],
})

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

// The Brutal style on paper: black ink and borders, the palette's colors
// (as in globals.css), Space Grotesk headings and JetBrains Mono figures.
// No shadows. Added on top of the styles above.
const ink = '#0a0a0a'
const brutalColors: Record<
  Palette,
  { action: string; highlight: string; tint: string }
> = {
  emerald: { action: '#10b981', highlight: '#6ee7b7', tint: '#f3ecd8' },
  sunshine: { action: '#ffd23f', highlight: '#ff7ab6', tint: '#f7e8bd' },
}

function brutalStyles(palette: Palette) {
  const { action, highlight, tint } = brutalColors[palette]
  return StyleSheet.create({
    page: { color: ink },
    title: {
      fontFamily: 'Space Grotesk',
      color: ink,
      backgroundColor: action,
      borderWidth: 2,
      borderColor: ink,
      lineHeight: 1,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    number: {
      fontFamily: 'JetBrains Mono',
      marginTop: 8,
      alignSelf: 'flex-end',
    },
    // Loud tilts the title on paper too; the dots stay on screens.
    loudTitle: { transform: 'rotate(-3deg)' },
    heading: { fontFamily: 'Space Grotesk' },
    figures: { fontFamily: 'JetBrains Mono', fontSize: 9 },
    row: { borderBottomColor: ink, paddingHorizontal: 4 },
    headRow: {
      fontFamily: 'Space Grotesk',
      color: ink,
      backgroundColor: tint,
      borderTopWidth: 2,
      borderBottomWidth: 2,
    },
    grandTotal: {
      backgroundColor: highlight,
      borderWidth: 2,
      borderColor: ink,
      paddingHorizontal: 6,
      paddingBottom: 6,
    },
    grandTotalAmount: { fontFamily: 'JetBrains Mono', fontWeight: 'bold' },
  })
}

const brutal = {
  emerald: brutalStyles('emerald'),
  sunshine: brutalStyles('sunshine'),
}

type BrutalStyles = ReturnType<typeof brutalStyles>

// A sent invoice as a printable A4 document, from the details captured
// when it was sent.
export function InvoicePdf({
  invoice,
  appearance = defaultAppearance,
}: InvoicePdfProps) {
  const money = (minor: number) => formatMoney(minor, invoice.currency)
  const percent = (rate: number) => (rate ? `${formatRate(rate)}%` : '—')
  const totals = invoiceTotals(invoice.lines)
  const business = invoice.businessDetails
  const dates: [string, string][] = [
    ['Issued', formatDate(invoice.issueDate)],
    ['Due', formatDate(invoice.dueDate)],
  ]
  if (invoice.paidOn) dates.push(['Paid', formatDate(invoice.paidOn)])
  const b =
    appearance.style === 'brutal' ? brutal[appearance.palette] : undefined
  const loud = appearance.strength === 'loud'
  const cell = [styles.cell, b?.figures]
  const wideCell = [styles.wideCell, b?.figures]

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author={business?.name}
      creator="Invoicely"
      producer="Invoicely"
    >
      <Page size="A4" style={[styles.page, b?.page]}>
        <View style={styles.header}>
          {business?.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- PDF images have no alt text
            <Image src={business.logoUrl} style={styles.logo} />
          ) : (
            <Text style={[styles.bold, b?.heading]}>{business?.name}</Text>
          )}
          <View>
            <Text
              style={[styles.title, b?.title, loud ? b?.loudTitle : undefined]}
            >
              {invoice.status === 'void' ? 'VOID INVOICE' : 'INVOICE'}
            </Text>
            <Text style={[styles.number, b?.number]}>{invoice.number}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          {business && <Party heading="From" details={business} b={b} />}
          {invoice.clientDetails && (
            <Party heading="Bill to" details={invoice.clientDetails} b={b} />
          )}
          <View style={styles.column}>
            {dates.map(([label, value]) => (
              <View key={label} style={styles.dateRow}>
                <Text style={{ color: colors.muted }}>{label}</Text>
                <Text style={b?.figures}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.row, styles.headRow, b?.row, b?.headRow]} fixed>
          <Text style={styles.description}>Description</Text>
          <Text style={styles.cell}>Quantity</Text>
          <Text style={styles.wideCell}>Unit price</Text>
          <Text style={styles.cell}>Tax</Text>
          <Text style={styles.cell}>Discount</Text>
          <Text style={styles.wideCell}>Amount</Text>
        </View>
        {invoice.lines.map((line) => (
          <View key={line.id} style={[styles.row, b?.row]} wrap={false}>
            <Text style={styles.description}>{line.description}</Text>
            <Text style={cell}>{formatQuantity(line.quantity)}</Text>
            <Text style={wideCell}>{money(line.unitPrice)}</Text>
            <Text style={cell}>{percent(line.taxRate)}</Text>
            <Text style={cell}>{percent(line.discountRate)}</Text>
            <Text style={wideCell}>{money(lineAmounts(line).net)}</Text>
          </View>
        ))}

        {totals && (
          <View style={styles.totals} wrap={false}>
            <TotalRow label="Subtotal" value={money(totals.subtotal)} b={b} />
            {totals.discount > 0 && (
              <TotalRow
                label="Discount"
                value={money(-totals.discount)}
                b={b}
              />
            )}
            {totals.taxes
              .filter((group) => group.rate)
              .map((group) => (
                <TotalRow
                  key={group.rate}
                  label={`Tax ${formatRate(group.rate)}%`}
                  value={money(group.tax)}
                  b={b}
                />
              ))}
            <View style={[styles.totalRow, styles.grandTotal, b?.grandTotal]}>
              <Text style={b?.heading}>Total</Text>
              <Text style={b?.grandTotalAmount}>{money(totals.total)}</Text>
            </View>
          </View>
        )}

        {(invoice.notes || invoice.terms) && (
          <View style={styles.notes} wrap={false}>
            {invoice.notes && (
              <Note heading="Notes" text={invoice.notes} b={b} />
            )}
            {invoice.terms && (
              <Note heading="Terms" text={invoice.terms} b={b} />
            )}
          </View>
        )}
      </Page>
    </Document>
  )
}

// Called directly: renderToBuffer wants the <Document> element itself.
export const renderInvoicePdf = (
  invoice: InvoicePdfProps['invoice'],
  appearance?: Appearance,
) => renderToBuffer(InvoicePdf({ invoice, appearance }))

// The invoice's PDF as a download named after its number. Only sent
// invoices have a number and the captured details the PDF prints.
export async function invoicePdfResponse(
  invoice: InvoicePdfProps['invoice'],
  appearance?: Appearance,
) {
  const pdf = await renderInvoicePdf(invoice, appearance)
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
  b,
}: {
  heading: string
  details: PartyDetails
  b?: BrutalStyles
}) {
  return (
    <View style={styles.column}>
      <Text style={[styles.label, b?.heading]}>{heading}</Text>
      <Text style={styles.bold}>{details.name}</Text>
      {partyLines(details).map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  )
}

function TotalRow({
  label,
  value,
  b,
}: {
  label: string
  value: string
  b?: BrutalStyles
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={b?.figures}>{value}</Text>
    </View>
  )
}

function Note({
  heading,
  text,
  b,
}: {
  heading: string
  text: string
  b?: BrutalStyles
}) {
  return (
    <View style={styles.column}>
      <Text style={[styles.label, b?.heading]}>{heading}</Text>
      <Text>{text}</Text>
    </View>
  )
}
