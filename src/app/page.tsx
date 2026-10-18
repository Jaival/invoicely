import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8 text-center">
      <div className="flex items-center gap-3">
        <FileText className="size-10 text-primary" aria-hidden />
        <h1 className="text-5xl font-bold tracking-tight">Invoicely</h1>
      </div>
      <p className="max-w-xl text-lg text-balance text-muted-foreground">
        Create professional invoices in minutes, send them instantly, and get
        paid faster.
      </p>
      <Button size="lg" disabled>
        Coming soon
      </Button>
    </main>
  )
}
