'use client'

import { isActivePath } from '@/components/app/nav'
import { buttonVariants } from '@/components/ui/button'
import { cn } from 'cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { title: 'Profile', href: '/settings/profile' },
  { title: 'Business', href: '/settings/business' },
  { title: 'Appearance', href: '/settings/appearance' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings"
      className="flex gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              buttonVariants({ variant: active ? 'secondary' : 'ghost' }),
              'justify-start',
              active &&
                'brutal:bg-accent brutal:text-accent-foreground brutal:hover:bg-accent',
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
