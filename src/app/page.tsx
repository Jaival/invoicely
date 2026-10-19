import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8 text-center">
      <div className="flex items-center gap-4">
        <Logo className="size-14" />
        <h1 className="text-5xl font-bold tracking-tight">Invoicely</h1>
      </div>
      <p className="max-w-xl text-lg text-balance text-muted-foreground">
        Create professional invoices in minutes, send them instantly, and get
        paid faster.
      </p>
      <div className="flex gap-3">
        <Button size="lg" asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </main>
  )
}
