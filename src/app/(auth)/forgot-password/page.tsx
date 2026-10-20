import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { emailEnabled } from '@/lib/auth'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

export const metadata: Metadata = { title: 'Reset your password' }

export default async function ForgotPasswordPage() {
  // Password reset needs email delivery, which is configured per
  // environment, so decide at request time rather than at build.
  await connection()
  if (!emailEnabled) notFound()

  return <ForgotPasswordForm />
}
