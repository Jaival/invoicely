import { cn } from 'cn'
import { describe, expect, it } from 'vitest'

import { buttonVariants } from '@/components/ui/button'

describe('buttonVariants', () => {
  it('applies the requested variant', () => {
    expect(buttonVariants({ variant: 'destructive' })).toContain(
      'bg-destructive',
    )
  })

  it('lets className override conflicting Tailwind classes via cn', () => {
    const classes = cn(buttonVariants({ className: 'px-8' })).split(' ')

    expect(classes).toContain('px-8')
    expect(classes).not.toContain('px-4')
  })
})
