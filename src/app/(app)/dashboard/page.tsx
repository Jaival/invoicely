import { PageTitle } from '@/components/app/page-title'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getActiveOrganization, getBusinessProfile } from '@/lib/organization'
import { requireOrganizationId, requireSession } from '@/lib/session'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }

// Placeholder until invoices give the dashboard something to show.
export default async function DashboardPage() {
  const [{ user }, organizationId] = await Promise.all([
    requireSession(),
    requireOrganizationId(),
  ])
  const [activeOrganization, profile] = await Promise.all([
    getActiveOrganization(organizationId),
    getBusinessProfile(organizationId),
  ])

  return (
    <>
      <div className="flex flex-col gap-1">
        <PageTitle>Welcome, {user.name}</PageTitle>
        <p className="text-muted-foreground">
          Signed in as {user.email}
          {activeOrganization && <> · {activeOrganization.name}</>}
        </p>
      </div>
      {!profile && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Set up your business profile</CardTitle>
            <CardDescription>
              Add your business name, address and currency. They appear on every
              invoice you send.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/settings/business">Set up profile</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
