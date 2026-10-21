'use client'

import { duplicate } from '@/app/(app)/invoices/actions'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

// Copies an invoice into a new draft dated today, then opens the draft.
export function useDuplicateInvoice(id: string) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      const result = await duplicate(id)
      if (result.status === 'error' || !result.id) {
        toast.error(result.message)
        return
      }
      toast.success('Duplicated as a new draft')
      router.push(`/invoices/${result.id}`)
    })
  }

  return [pending, run] as const
}
