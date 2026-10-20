import { BusinessProfileForm } from '@/components/settings/business-profile-form'
import { env } from '@/env/server'
import { getActiveOrganization, getBusinessProfile } from '@/lib/organization'
import { requireSession } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Business' }

export default async function BusinessSettingsPage() {
  const { session } = await requireSession()
  const organizationId = session.activeOrganizationId
  const [activeOrganization, profile] = organizationId
    ? await Promise.all([
        getActiveOrganization(organizationId),
        getBusinessProfile(organizationId),
      ])
    : []

  return (
    <BusinessProfileForm
      // Until the profile is saved, start from the organization's name.
      profile={{
        name: profile?.name ?? activeOrganization?.name ?? '',
        email: profile?.email ?? '',
        taxId: profile?.taxId ?? '',
        addressLine1: profile?.addressLine1 ?? '',
        addressLine2: profile?.addressLine2 ?? '',
        city: profile?.city ?? '',
        region: profile?.region ?? '',
        postalCode: profile?.postalCode ?? '',
        country: profile?.country ?? '',
        defaultCurrency: profile?.defaultCurrency ?? 'USD',
        invoicePrefix: profile?.invoicePrefix ?? 'INV',
      }}
      logoUrl={profile?.logoUrl ?? null}
      logoUploadEnabled={!!env.BLOB_READ_WRITE_TOKEN}
    />
  )
}
