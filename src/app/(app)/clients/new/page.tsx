import { ClientForm } from '@/components/clients/client-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New client' }

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <ClientForm
        client={{
          name: '',
          email: '',
          taxId: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          region: '',
          postalCode: '',
          country: '',
          notes: '',
        }}
      />
    </div>
  )
}
