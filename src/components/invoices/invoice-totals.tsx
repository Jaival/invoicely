import { formatMoney, formatRate, type InvoiceTotals } from '@/lib/money'

type InvoiceTotalsListProps = {
  // null when the amounts are too large to add up.
  totals: InvoiceTotals | null
  currency: string
  // What has been paid of a sent invoice so far.
  amountPaid?: number
}

// Subtotal, discount, one row per tax rate, and the total, then what's paid
// and left to pay once anything is. Printed, a page break never splits them.
export function InvoiceTotalsList({
  totals,
  currency,
  amountPaid = 0,
}: InvoiceTotalsListProps) {
  if (!totals) {
    return (
      <p role="status" className="text-sm text-destructive sm:text-right">
        These amounts are too large to add up.
      </p>
    )
  }

  const money = (minor: number) => formatMoney(minor, currency)
  const rows: [string, number][] = [['Subtotal', totals.subtotal]]
  if (totals.discount) rows.push(['Discount', -totals.discount])
  for (const group of totals.taxes) {
    if (group.rate) rows.push([`Tax ${formatRate(group.rate)}%`, group.tax])
  }

  return (
    <dl className="grid break-inside-avoid grid-cols-[1fr_auto] gap-x-8 gap-y-1 text-sm tabular-nums sm:ml-auto sm:min-w-72">
      {rows.map(([label, amount]) => (
        <div key={label} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-figures">{money(amount)}</dd>
        </div>
      ))}
      <div className="col-span-2 mt-2 grid grid-cols-subgrid border-t pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="text-right font-figures">{money(totals.total)}</dd>
      </div>
      {amountPaid > 0 && (
        <>
          <div className="col-span-2 grid grid-cols-subgrid">
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-right font-figures">{money(-amountPaid)}</dd>
          </div>
          <div className="col-span-2 grid grid-cols-subgrid font-semibold">
            <dt>Balance due</dt>
            <dd className="text-right font-figures">
              {money(totals.total - amountPaid)}
            </dd>
          </div>
        </>
      )}
    </dl>
  )
}
