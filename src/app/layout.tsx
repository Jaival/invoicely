import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { env } from '@/env/client'
import { appearanceAttributes, userAppearance } from '@/lib/appearance'
import { getSession } from '@/lib/session'
import { cn } from 'cn'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Only the Brutal style uses these. Without preloading, browsers download a
// font the first time a page uses it, so the Clean style never does.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  preload: false,
})
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  preload: false,
})

const description =
  'Create professional invoices in minutes, send them instantly, and get paid faster.'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: 'Invoicely',
    template: '%s · Invoicely',
  },
  description,
  applicationName: 'Invoicely',
  openGraph: {
    type: 'website',
    siteName: 'Invoicely',
    title: 'Invoicely',
    description,
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020618' },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // The signed-in user's style is set here, on the server, so pages arrive
  // already styled. Signing in and out refreshes the router, which renders
  // this again.
  const appearance = userAppearance((await getSession())?.user)

  return (
    <html
      lang="en"
      className={cn(
        inter.variable,
        spaceGrotesk.variable,
        jetBrainsMono.variable,
      )}
      {...appearanceAttributes(appearance)}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          // Brutal has no dark version yet.
          forcedTheme={appearance.style === 'brutal' ? 'light' : undefined}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
