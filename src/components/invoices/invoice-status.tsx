import { Badge } from '@/components/ui/badge'
import type { DisplayStatus } from '@/lib/invoices/status'
import { cn } from 'cn'

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

// Brutal gives every status its own loud color, all with dark ink.
const brutalColors: Record<DisplayStatus, string> = {
  draft: 'brutal:bg-status-draft',
  sent: 'brutal:bg-status-sent',
  overdue: 'brutal:bg-status-overdue',
  paid: 'brutal:bg-status-paid',
  void: 'brutal:bg-card',
}

// Printers drop background colors, which would leave light text on white,
// so badges print as outlines.
const printed =
  'print:border-current print:bg-transparent print:text-foreground'

export function InvoiceStatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={cn(
        status === 'void' && 'text-muted-foreground',
        'brutal:text-foreground',
        brutalColors[status],
        printed,
      )}
    >
      {labels[status]}
    </Badge>
  )
}
