'use client'

import { CheckEmail } from '@/components/auth/check-email'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [sentTo, setSentTo] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email'))

    setPending(true)
    setError(undefined)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setPending(false)
    if (error) {
      setError(error.message ?? 'Something went wrong. Please try again.')
      return
    }
    // Shown whether or not the account exists, so this can't be used to
    // find out who has one.
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <CheckEmail
        email={sentTo}
        description="If an account uses this email, we sent a link to reset its password."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Reset your password</h1>
        </CardTitle>
        <CardDescription>
          Enter your account email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link
          href="/sign-in"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
