import { countryCodes } from '@/lib/locale-data'
import * as z from 'zod'

// Field rules shared by forms. Blank optional fields are stored as null.

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((value) => value || null)

export const optionalEmail = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), z.email('Enter a valid email')]))
  .transform((value) => value || null)

export const optionalCountry = z
  .string()
  .refine((value) => !value || countryCodes.has(value), 'Pick a country')
  .transform((value) => value || null)

export const address = {
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  region: optionalText(100),
  postalCode: optionalText(20),
  country: optionalCountry,
}

// Postgres rejects malformed uuids with an error, so check ids from URLs and
// forms before querying with them.
export const isUuid = (value: string) => z.uuid().safeParse(value).success
