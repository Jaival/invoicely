import { formatMoney } from '@/lib/money'
import { cn } from 'cn'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

// What to say when there's no amount, in any currency.
const NOTHING = 'Nothing'

// Brutal fills a box that has amounts with its status color, and Loud tilts
// the overdue one. Clean colors the amounts instead.
const tones = {
  overdue: {
    box: 'brutal:bg-status-overdue brutal:text-status-foreground loud:rotate-[1.5deg]',
    amounts: 'text-destructive brutal:text-status-foreground',
  },
  paid: {
    box: 'brutal:bg-status-paid brutal:text-status-foreground loud:-rotate-1',
    amounts: 'text-primary brutal:text-status-foreground',
  },
}

const label =
  'text-sm text-muted-foreground brutal:text-xs brutal:font-semibold brutal:tracking-wider brutal:uppercase'

// A labelled total, one line per currency, since amounts in different
// currencies are never added together. Goes inside a <dl>. With an href,
// the whole box links to the invoices behind it.
export function MoneyStat({
  title,
  amounts,
  tone,
  href,
  className,
}: {
  title: string
  amounts: { currency: string; amount: number }[]
  tone?: keyof typeof tones
  href?: string
  className?: string
}) {
  const shown = amounts.filter((row) => row.amount > 0)
  const toned = tone && shown.length > 0 ? tones[tone] : undefined

  return (
    <div
      className={cn(
        'panel p-4',
        href &&
          'relative transition-colors hover:bg-muted/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 brutal:duration-75 brutal:hover:shadow-brutal-sm motion-safe:brutal:hover:translate-[2px]',
        toned?.box,
        className,
      )}
    >
      <dt
        className={cn(
          label,
          toned && 'brutal:text-status-foreground',
          href && 'flex items-center justify-between gap-2',
        )}
      >
        {href ? (
          <>
            {/* Stretched over the box, so all of it is the link. */}
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0"
            >
              {title}
            </Link>
            <ArrowRight aria-hidden className="size-4" />
          </>
        ) : (
          title
        )}
      </dt>
      <dd
        className={cn(
          'mt-1 font-figures text-xl font-semibold tabular-nums',
          toned?.amounts,
        )}
      >
        {shown.length > 0
          ? shown.map((row) => (
              <span key={row.currency} className="block">
                {formatMoney(row.amount, row.currency)}
              </span>
            ))
          : NOTHING}
      </dd>
    </div>
  )
}
