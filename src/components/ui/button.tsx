import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

// Brutal buttons with a border sit on a hard shadow as deep as --press, and
// press into it when clicked. Without motion they only lose the shadow.
const pressable =
  'brutal:border-2 brutal:border-foreground brutal:shadow-press brutal:active:shadow-none motion-safe:brutal:active:translate-(--press)'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 brutal:font-heading brutal:font-semibold brutal:duration-75 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary text-primary-foreground hover:bg-primary/90',
          pressable,
        ),
        destructive: cn(
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 brutal:text-destructive-foreground',
          pressable,
        ),
        outline: cn(
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 brutal:bg-card',
          pressable,
        ),
        secondary: cn(
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 brutal:hover:bg-accent brutal:hover:text-accent-foreground',
          pressable,
        ),
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        // Palette colors are too light for text on Brutal's paper.
        link: 'text-primary underline-offset-4 hover:underline brutal:text-foreground brutal:underline brutal:decoration-2',
      },
      size: {
        default: 'h-9 px-4 py-2 [--press:4px] has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs [--press:2px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 [--press:3px] has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 [--press:4px] has-[>svg]:px-4',
        icon: 'size-9 [--press:3px]',
        'icon-xs':
          "size-6 rounded-md [--press:2px] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8 [--press:2px]',
        'icon-lg': 'size-10 [--press:4px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
