'use client'

import { Button } from '@/components/ui/button'
import { Link } from 'lucide-react'
import { toast } from 'sonner'

// Copies an invoice's public link, for sharing with a client by hand.
export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  } catch {
    toast.error('Couldn’t copy the link', { description: url })
  }
}

export function CopyLinkButton({ url }: { url: string }) {
  return (
    <Button variant="outline" onClick={() => copyLink(url)}>
      <Link />
      Copy link
    </Button>
  )
}
