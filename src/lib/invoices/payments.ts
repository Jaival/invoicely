import type { PaymentMethod } from '@/db/schema'
import { paymentDateError } from '@/lib/invoices/status'
import { formatMoney, parseAmount } from '@/lib/money'
import { optionalText } from '@/lib/validation'

// Recording a payment by hand. The form submits what was typed, as strings;
// parsing checks it against what's left to pay.

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
}

export const isPaymentMethod = (value: string): value is PaymentMethod =>
  Object.hasOwn(paymentMethodLabels, value)

export type PaymentInput = {
  amount: string
  // YYYY-MM-DD
  receivedOn: string
  method: string
  reference: string
}

export type PaymentValues = {
  // Minor units.
  amount: number
  receivedOn: string
  method: PaymentMethod
  reference: string | null
}

const reference = optionalText(200)

// The payment as stored, or a message for each field that's wrong. balance
// is what's left to pay, and today the business's.
export function parsePayment(
  input: PaymentInput,
  { currency, balance }: { currency: string; balance: number },
  today: string,
):
  | { values: PaymentValues; fieldErrors?: undefined }
  | { fieldErrors: Partial<Record<keyof PaymentInput, string>> } {
  const fieldErrors: Partial<Record<keyof PaymentInput, string>> = {}

  const amount = parseAmount(input.amount, currency)
  if (amount === null) {
    fieldErrors.amount = 'Enter an amount, e.g. 120.50'
  } else if (amount === 0) {
    fieldErrors.amount = 'Enter more than 0'
  } else if (amount > balance) {
    fieldErrors.amount = `That’s more than the ${formatMoney(balance, currency)} left`
  }
  const dateError = paymentDateError(input.receivedOn, today)
  if (dateError) fieldErrors.receivedOn = dateError
  if (!isPaymentMethod(input.method)) {
    fieldErrors.method = 'Pick how it was paid'
  }
  const parsedReference = reference.safeParse(input.reference)
  if (!parsedReference.success) {
    fieldErrors.reference = parsedReference.error.issues[0].message
  }

  if (
    amount === null ||
    !isPaymentMethod(input.method) ||
    !parsedReference.success ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { fieldErrors }
  }
  return {
    values: {
      amount,
      receivedOn: input.receivedOn,
      method: input.method,
      reference: parsedReference.data,
    },
  }
}
