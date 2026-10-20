'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const newPassword = String(
      new FormData(event.currentTarget).get('password'),
    )

    setPending(true)
    setError(undefined)
    const { error } = await authClient.resetPassword({ newPassword, token })
    if (error) {
      setError(
        error.code === 'INVALID_TOKEN'
          ? 'This link has expired. Request a new one.'
          : (error.message ?? 'Something went wrong. Please try again.'),
      )
      setPending(false)
      return
    }
    router.push('/sign-in?reset=success')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Choose a new password</h1>
        </CardTitle>
        <CardDescription>This signs you out everywhere else.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
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
            Reset password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
