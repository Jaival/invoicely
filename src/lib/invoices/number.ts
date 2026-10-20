// "INV-0042": the business's prefix and the invoice's sequence, padded to
// four digits so early numbers sort and line up. Longer sequences just grow.
export function formatInvoiceNumber(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, '0')}`
}
