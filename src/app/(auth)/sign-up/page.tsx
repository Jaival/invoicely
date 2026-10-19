import { AuthForm } from '@/components/auth/auth-form'
import { googleEnabled } from '@/lib/auth'
import { getSession } from '@/lib/session'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Create your account' }

export default async function SignUpPage() {
  if (await getSession()) redirect('/dashboard')

  return <AuthForm mode="sign-up" googleEnabled={googleEnabled} />
}
