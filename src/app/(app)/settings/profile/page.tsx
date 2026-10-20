import { PasswordForm } from '@/components/settings/password-form'
import { ProfileForm } from '@/components/settings/profile-form'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { requireSession } from '@/lib/session'
import type { Metadata } from 'next'
import { headers } from 'next/headers'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfileSettingsPage() {
  const { user } = await requireSession()
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  })
  // Google-only users have no password to change.
  const hasPassword = accounts.some(
    (account) => account.providerId === 'credential',
  )

  return (
    <>
      <ProfileForm name={user.name} email={user.email} />
      {hasPassword ? (
        <PasswordForm />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              You sign in with Google, so there is no password to change.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </>
  )
}
