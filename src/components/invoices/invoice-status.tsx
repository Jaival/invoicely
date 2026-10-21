import { Badge } from '@/components/ui/badge'
import type { DisplayStatus } from '@/lib/invoices/status'

const labels: Record<DisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  overdue: 'Overdue',
  paid: 'Paid',
  void: 'Void',
}

const variants = {
  draft: 'outline',
  sent: 'secondary',
  overdue: 'destructive',
  paid: 'default',
  void: 'outline',
} as const

export function InvoiceStatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={status === 'void' ? 'text-muted-foreground' : undefined}
    >
      {labels[status]}
    </Badge>
  )
}
