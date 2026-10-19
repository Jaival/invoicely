import { Logo } from '@/components/logo'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <Link href="/" className="flex items-center gap-3">
        <Logo className="size-9" />
        <span className="text-2xl font-bold tracking-tight">Invoicely</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
