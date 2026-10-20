'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

type CheckEmailProps = {
  email: string
  description: string
  // Where the verification link signs the user in to. Omit for emails that
  // aren't verification links (e.g. password reset).
  callbackURL?: string
}

export function CheckEmail({
  email,
  description,
  callbackURL,
}: CheckEmailProps) {
  const [pending, setPending] = useState(false)

  async function resend() {
    if (!callbackURL) return
    setPending(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL,
    })
    setPending(false)
    if (error) {
      toast.error(error.message ?? 'Could not send the email. Try again.')
    } else {
      toast.success('Sent another link')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Check your email</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        We sent it to <span className="font-medium">{email}</span>. It can take
        a minute to arrive; check your spam folder too.
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <Link
          href="/sign-in"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
        {callbackURL && (
          <Button variant="outline" disabled={pending} onClick={resend}>
            {pending && <Loader2 className="animate-spin" />}
            Resend email
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
