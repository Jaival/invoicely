import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { emailEnabled } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

export const metadata: Metadata = { title: 'Choose a new password' }

// The emailed link goes through Better Auth, which redirects here with
// ?token=… or, if the link has expired, ?error=INVALID_TOKEN.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string }>
}) {
  // Decided per request; see forgot-password.
  await connection()
  if (!emailEnabled) notFound()

  const { token } = await searchParams
  if (typeof token === 'string' && token) {
    return <ResetPasswordForm token={token} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>This link has expired</h1>
        </CardTitle>
        <CardDescription>
          Reset links work once and expire after an hour. Request a new one.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
