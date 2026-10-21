'use client'

import { Button } from '@/components/ui/button'
import { Link } from 'lucide-react'
import { toast } from 'sonner'

// Copies the invoice's public link, for sharing with a client by hand until
// invoices are emailed.
export function CopyLinkButton({ url }: { url: string }) {
  async function onClick() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Couldn’t copy the link', { description: url })
    }
  }

  return (
    <Button variant="outline" onClick={onClick}>
      <Link />
      Copy link
    </Button>
  )
}
