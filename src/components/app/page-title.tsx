import { cn } from 'cn'

// Loud turns a heading into a tilted, highlighted sticker.
export const loudSticker =
  'loud:w-fit loud:-rotate-[1.5deg] loud:border-2 loud:border-foreground loud:bg-accent loud:px-2 loud:text-accent-foreground loud:shadow-brutal-sm'

// A page's heading. Loud also blows it up.
export function PageTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'text-2xl font-semibold tracking-tight',
        loudSticker,
        'loud:mb-2 loud:text-4xl loud:font-bold loud:tracking-tighter loud:shadow-brutal loud:sm:text-[2.75rem]',
        className,
      )}
      {...props}
    />
  )
}
