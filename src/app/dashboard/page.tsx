import { SignOutButton } from '@/components/auth/sign-out-button'
import { Logo } from '@/components/logo'
import { db } from '@/db'
import { organization } from '@/db/schema'
import { requireSession } from '@/lib/session'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

// Placeholder until the app shell lands.
export default async function DashboardPage() {
  const { user, session } = await requireSession()
  const [activeOrganization] = session.activeOrganizationId
    ? await db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, session.activeOrganizationId))
    : []

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <Logo className="size-12" />
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, {user.name}
      </h1>
      <p className="text-muted-foreground">
        Signed in as {user.email}
        {activeOrganization && <> · {activeOrganization.name}</>}
      </p>
      <SignOutButton />
    </main>
  )
}
