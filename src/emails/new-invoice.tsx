import { ActionEmail } from './layout'

type NewInvoiceEmailProps = {
  businessName: string
  number: string
  // Formatted, e.g. "€1,190.00" and "Oct 15, 2026".
  amount: string
  dueDate: string
  url: string
}

// Sent to the client when the business sends an invoice, with its PDF.
export function NewInvoiceEmail({
  businessName,
  number,
  amount,
  dueDate,
  url,
}: NewInvoiceEmailProps) {
  return (
    <ActionEmail
      preview={`Invoice ${number} from ${businessName}: ${amount} due ${dueDate}`}
      heading={`You have a new invoice from ${businessName}`}
      intro={`Invoice ${number} for ${amount} is due on ${dueDate}. The PDF is attached, and you can view the invoice online any time.`}
      action={{ label: 'View invoice', url }}
      footnote={`Questions about this invoice? Reply to this email to reach ${businessName}.`}
    />
  )
}
