import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/db/schema'

const labels: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
}

const variants = {
  draft: 'outline',
  sent: 'secondary',
  paid: 'default',
  void: 'outline',
} as const

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={status === 'void' ? 'text-muted-foreground' : undefined}
    >
      {labels[status]}
    </Badge>
  )
}
