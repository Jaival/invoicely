'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

// Opens the browser's print dialog; the page's print styles leave just the
// invoice.
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer />
      Print
    </Button>
  )
}
