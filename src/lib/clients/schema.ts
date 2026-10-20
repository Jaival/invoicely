import { address, optionalEmail, optionalText } from '@/lib/validation'
import * as z from 'zod'

// Shared by the client form and its server action.
export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter the client’s name')
    .max(100, 'Keep it under 100 characters'),
  email: optionalEmail,
  taxId: optionalText(50),
  ...address,
  notes: optionalText(2000),
})

export type ClientInput = z.input<typeof clientSchema>
export type ClientValues = z.output<typeof clientSchema>
