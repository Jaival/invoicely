import { BusinessProfileForm } from '@/components/settings/business-profile-form'
import { env } from '@/env/server'
import { timeZoneOptions } from '@/lib/locale-data'
import { getActiveOrganization, getBusinessProfile } from '@/lib/organization'
import { requireOrganizationId } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Business' }

export default async function BusinessSettingsPage() {
  const organizationId = await requireOrganizationId()
  const [activeOrganization, profile] = await Promise.all([
    getActiveOrganization(organizationId),
    getBusinessProfile(organizationId),
  ])

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
        // Blank until chosen; the form suggests the browser's.
        timeZone: profile?.timeZone ?? '',
        publicStyle: profile?.publicStyle ?? 'clean',
      }}
      timeZones={timeZoneOptions()}
      logoUrl={profile?.logoUrl ?? null}
      logoUploadEnabled={!!env.BLOB_READ_WRITE_TOKEN}
    />
  )
}
