import { currencyCodes } from '@/lib/locale-data'
import { address, optionalEmail, optionalText } from '@/lib/validation'
import * as z from 'zod'

// Shared by the settings form (client) and its server action.

export const LOGO_MAX_BYTES = 512 * 1024
// PNG and JPEG only: they're what the PDF renderer can embed.
export const LOGO_ACCEPT = 'image/png,image/jpeg'

export const businessProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your business name')
    .max(100, 'Keep it under 100 characters'),
  email: optionalEmail,
  taxId: optionalText(50),
  ...address,
  defaultCurrency: z
    .string()
    .refine((value) => currencyCodes.has(value), 'Pick a currency'),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,10}$/, 'Use 1–10 letters, numbers or hyphens'),
})

export type BusinessProfileInput = z.input<typeof businessProfileSchema>
export type BusinessProfileValues = z.output<typeof businessProfileSchema>

// Identifies an upload by its first bytes rather than trusting the browser's
// declared type.
export function detectLogoType(bytes: Uint8Array) {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (png.every((byte, index) => bytes[index] === byte)) {
    return { contentType: 'image/png', extension: 'png' } as const
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' } as const
  }
  return null
}
