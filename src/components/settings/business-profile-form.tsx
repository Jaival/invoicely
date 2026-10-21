'use client'

import { SelectField, TextField } from '@/components/form-fields'
import {
  saveBusinessProfile,
  type BusinessProfileState,
} from '@/app/(app)/settings/business/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  LOGO_ACCEPT,
  LOGO_MAX_BYTES,
  type BusinessProfileInput,
} from '@/lib/business-profile'
import { timeZoneLabel } from '@/lib/dates'
import { countries, currencies, type Option } from '@/lib/locale-data'
import { ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { toast } from 'sonner'

type BusinessProfileFormProps = {
  profile: BusinessProfileInput
  logoUrl: string | null
  logoUploadEnabled: boolean
  timeZones: Option[]
}

// The browser's time zone, once hydrated; blank while rendering on the
// server, which can't know it.
const noSubscription = () => () => {}
const useBrowserTimeZone = () =>
  useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => '',
  )

export function BusinessProfileForm({
  profile,
  logoUrl,
  logoUploadEnabled,
  timeZones,
}: BusinessProfileFormProps) {
  const browserTimeZone = useBrowserTimeZone()
  const timeZone = profile.timeZone || browserTimeZone
  // Runtimes can name a zone differently (Asia/Kolkata or Asia/Calcutta), so
  // offer the browser's even if the server's list lacks it.
  const timeZoneChoices =
    !timeZone || timeZones.some((option) => option.code === timeZone)
      ? timeZones
      : [{ code: timeZone, name: timeZoneLabel(timeZone) }, ...timeZones]
  const [state, setState] = useState<BusinessProfileState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()
  const logoInput = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string>()
  const [removeLogo, setRemoveLogo] = useState(false)

  const shownLogo = logoPreview ?? (removeLogo ? null : logoUrl)

  function errorFor(field: string) {
    return field === 'logo'
      ? (logoError ?? state.fieldErrors?.logo?.[0])
      : state.fieldErrors?.[field]?.[0]
  }

  function onLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoPreview(null)
    setLogoError(undefined)
    if (!file) return

    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
      setLogoError('Upload a PNG or JPEG image.')
    } else if (file.size > LOGO_MAX_BYTES) {
      setLogoError('Logos must be 512 KB or smaller.')
    } else {
      setLogoPreview(URL.createObjectURL(file))
      setRemoveLogo(false)
      return
    }
    event.target.value = ''
  }

  function onRemoveLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    if (logoInput.current) logoInput.current.value = ''
    setLogoPreview(null)
    setLogoError(undefined)
    setRemoveLogo(true)
  }

  // Submitting through onSubmit rather than <form action> keeps what the
  // user typed when validation fails (form actions reset the fields).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (logoError) return
    const formData = new FormData(event.currentTarget)
    formData.set('removeLogo', String(removeLogo))

    startTransition(async () => {
      const result = await saveBusinessProfile(state, formData)
      setState(result)
      if (result.status === 'success') {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        if (logoInput.current) logoInput.current.value = ''
        setLogoPreview(null)
        setRemoveLogo(false)
        toast.success('Business profile saved')
      }
    })
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            These details appear on every invoice you send.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Business</FieldLegend>
              <FieldGroup>
                <Field data-invalid={errorFor('logo') ? true : undefined}>
                  <FieldLabel htmlFor="logo">Logo</FieldLabel>
                  <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center border bg-muted">
                      {shownLogo ? (
                        <Image
                          src={shownLogo}
                          alt="Business logo"
                          width={64}
                          height={64}
                          unoptimized
                          className="size-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Input
                        ref={logoInput}
                        id="logo"
                        name="logo"
                        type="file"
                        accept={LOGO_ACCEPT}
                        disabled={!logoUploadEnabled}
                        onChange={onLogoChange}
                        aria-invalid={errorFor('logo') ? true : undefined}
                      />
                      {shownLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="self-start"
                          onClick={onRemoveLogo}
                        >
                          Remove logo
                        </Button>
                      )}
                    </div>
                  </div>
                  <FieldDescription>
                    {logoUploadEnabled
                      ? 'PNG or JPEG, up to 512 KB.'
                      : 'Logo upload is not set up on this server.'}
                  </FieldDescription>
                  <FieldError>{errorFor('logo')}</FieldError>
                </Field>
                <TextField
                  name="name"
                  label="Business name"
                  defaultValue={profile.name}
                  error={errorFor('name')}
                  autoComplete="organization"
                  required
                />
                <TextField
                  name="email"
                  label="Billing email"
                  type="email"
                  defaultValue={profile.email}
                  error={errorFor('email')}
                  autoComplete="email"
                  description="Shown on invoices so clients can reach you."
                />
                <TextField
                  name="taxId"
                  label="Tax ID"
                  defaultValue={profile.taxId}
                  error={errorFor('taxId')}
                  description="VAT, GST or other tax number, if you have one."
                />
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <FieldSet>
              <FieldLegend>Address</FieldLegend>
              <FieldGroup>
                <TextField
                  name="addressLine1"
                  label="Address line 1"
                  defaultValue={profile.addressLine1}
                  error={errorFor('addressLine1')}
                  autoComplete="address-line1"
                />
                <TextField
                  name="addressLine2"
                  label="Address line 2"
                  defaultValue={profile.addressLine2}
                  error={errorFor('addressLine2')}
                  autoComplete="address-line2"
                />
                <div className="grid gap-7 sm:grid-cols-2">
                  <TextField
                    name="city"
                    label="City"
                    defaultValue={profile.city}
                    error={errorFor('city')}
                    autoComplete="address-level2"
                  />
                  <TextField
                    name="region"
                    label="State / region"
                    defaultValue={profile.region}
                    error={errorFor('region')}
                    autoComplete="address-level1"
                  />
                  <TextField
                    name="postalCode"
                    label="Postal code"
                    defaultValue={profile.postalCode}
                    error={errorFor('postalCode')}
                    autoComplete="postal-code"
                  />
                  <SelectField
                    name="country"
                    label="Country"
                    placeholder="Select a country"
                    options={countries}
                    defaultValue={profile.country}
                    error={errorFor('country')}
                  />
                </div>
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <FieldSet>
              <FieldLegend>Invoices</FieldLegend>
              <FieldGroup>
                <div className="grid gap-7 sm:grid-cols-2">
                  <SelectField
                    name="defaultCurrency"
                    label="Default currency"
                    placeholder="Select a currency"
                    options={currencies}
                    showCode
                    defaultValue={profile.defaultCurrency}
                    error={errorFor('defaultCurrency')}
                  />
                  <TextField
                    name="invoicePrefix"
                    label="Invoice number prefix"
                    defaultValue={profile.invoicePrefix}
                    error={errorFor('invoicePrefix')}
                    description="For example INV gives INV-0001."
                    className="uppercase"
                    maxLength={10}
                    required
                  />
                  <SelectField
                    // Remounts with the browser's zone once it's known.
                    key={timeZone}
                    name="timeZone"
                    label="Time zone"
                    placeholder="Select a time zone"
                    options={timeZoneChoices}
                    defaultValue={timeZone}
                    error={errorFor('timeZone')}
                    description="Your day starts at midnight here: new invoices are dated today, and invoices become overdue after their due date."
                  />
                </div>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
          {state.status === 'error' && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
