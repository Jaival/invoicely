'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <Button variant="outline" disabled={pending} onClick={onClick}>
      {pending && <Loader2 className="animate-spin" />}
      Sign out
    </Button>
  )
}
