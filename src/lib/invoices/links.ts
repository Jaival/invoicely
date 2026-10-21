import { env } from '@/env/client'

// The link a client opens a sent invoice with, without signing in.
export const publicInvoiceUrl = (token: string) =>
  new URL(`/i/${token}`, env.NEXT_PUBLIC_APP_URL).href
