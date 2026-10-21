import type { PartyDetails } from '@/db/schema'
import { countries } from '@/lib/locale-data'

const countryNames = new Map(countries.map(({ code, name }) => [code, name]))

// The lines printed under a party's name: address, email and tax ID, with
// the blanks left out. Shared by the web view and the PDF.
export function partyLines(details: PartyDetails) {
  const place = [details.postalCode, details.city].filter(Boolean).join(' ')
  return [
    details.addressLine1,
    details.addressLine2,
    place,
    details.region,
    details.country && (countryNames.get(details.country) ?? details.country),
    details.email,
    details.taxId && `Tax ID ${details.taxId}`,
  ].filter((line): line is string => Boolean(line))
}
