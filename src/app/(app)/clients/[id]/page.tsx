import { ClientForm } from '@/components/clients/client-form'
import { getClient } from '@/lib/clients/queries'
import { requireOrganizationId } from '@/lib/session'
import { isUuid } from '@/lib/validation'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Client' }

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [{ id }, organizationId] = await Promise.all([
    params,
    requireOrganizationId(),
  ])
  // Another organization's client is as missing as one that never existed.
  const client = isUuid(id) ? await getClient(organizationId, id) : undefined
  if (!client) notFound()

  return (
    <div className="max-w-2xl">
      <ClientForm
        id={client.id}
        client={{
          name: client.name,
          email: client.email ?? '',
          taxId: client.taxId ?? '',
          addressLine1: client.addressLine1 ?? '',
          addressLine2: client.addressLine2 ?? '',
          city: client.city ?? '',
          region: client.region ?? '',
          postalCode: client.postalCode ?? '',
          country: client.country ?? '',
          notes: client.notes ?? '',
        }}
      />
    </div>
  )
}
