import { AuthForm } from '@/components/auth/auth-form'
import { googleEnabled } from '@/lib/auth'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Sign in' }

// Better Auth sends social sign-in failures back here as ?error=<code>.
const errorMessages: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  account_not_linked:
    'This email already has an account. Sign in with your password instead.',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  if (await getSession()) redirect('/dashboard')

  const { error } = await searchParams
  const initialError =
    typeof error === 'string'
      ? (errorMessages[error] ?? 'Sign-in failed. Please try again.')
      : undefined

  return (
    <AuthForm
      mode="sign-in"
      googleEnabled={googleEnabled}
      initialError={initialError}
    />
  )
}
