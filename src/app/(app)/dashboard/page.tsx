import { getActiveOrganization } from '@/lib/organization'
import { requireSession } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

// Placeholder until invoices give the dashboard something to show.
export default async function DashboardPage() {
  const { user, session } = await requireSession()
  const activeOrganization = await getActiveOrganization(
    session.activeOrganizationId,
  )

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user.name}
      </h1>
      <p className="text-muted-foreground">
        Signed in as {user.email}
        {activeOrganization && <> · {activeOrganization.name}</>}
      </p>
    </div>
  )
}
