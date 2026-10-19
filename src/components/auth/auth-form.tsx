'use client'

import { GoogleIcon } from '@/components/auth/google-icon'
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
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const AFTER_AUTH_URL = '/dashboard'

const copy = {
  'sign-in': {
    title: 'Sign in',
    description: 'Welcome back. Sign in to your account.',
    submit: 'Sign in',
    switchPrompt: 'New to Invoicely?',
    switchLabel: 'Create an account',
    switchHref: '/sign-up',
  },
  'sign-up': {
    title: 'Create your account',
    description: 'Start sending invoices in minutes.',
    submit: 'Create account',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/sign-in',
  },
} as const

type AuthFormProps = {
  mode: keyof typeof copy
  googleEnabled: boolean
  initialError?: string
}

export function AuthForm({ mode, googleEnabled, initialError }: AuthFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState(initialError)
  const text = copy[mode]

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))

    setPending('email')
    setError(undefined)
    const { error } =
      mode === 'sign-up'
        ? await authClient.signUp.email({
            name: String(form.get('name')),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password })

    if (error) {
      setError(error.message ?? 'Something went wrong. Please try again.')
      setPending(null)
      return
    }
    router.push(AFTER_AUTH_URL)
    router.refresh()
  }

  async function onGoogle() {
    setPending('google')
    setError(undefined)
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: AFTER_AUTH_URL,
      errorCallbackURL: '/sign-in',
    })
    // On success the browser is already on its way to Google.
    if (error) {
      setError(error.message ?? 'Google sign-in failed. Please try again.')
      setPending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>{text.title}</h1>
        </CardTitle>
        <CardDescription>{text.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {googleEnabled && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending !== null}
              onClick={onGoogle}
            >
              {pending === 'google' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <form className="grid gap-4" onSubmit={onSubmit}>
          {mode === 'sign-up' && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
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
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === 'sign-up' ? 'new-password' : 'current-password'
              }
              minLength={mode === 'sign-up' ? 8 : undefined}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending !== null}>
            {pending === 'email' && <Loader2 className="animate-spin" />}
            {text.submit}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
        {text.switchPrompt}
        <Link
          href={text.switchHref}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {text.switchLabel}
        </Link>
      </CardFooter>
    </Card>
  )
}
