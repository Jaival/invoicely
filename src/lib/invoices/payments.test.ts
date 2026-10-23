import { describe, expect, it } from 'vitest'

import { isPaymentMethod, parsePayment, type PaymentInput } from './payments'

const today = '2026-10-21'
// €120.50 left to pay.
const invoice = { currency: 'EUR', balance: 12050 }

const input = (changes: Partial<PaymentInput> = {}): PaymentInput => ({
  amount: '100',
  receivedOn: '2026-10-20',
  method: 'bank_transfer',
  reference: '',
  ...changes,
})

describe('parsePayment', () => {
  it('turns the form into a payment in minor units', () => {
    expect(
      parsePayment(input({ reference: '  REF-42 ' }), invoice, today),
    ).toEqual({
      values: {
        amount: 10000,
        receivedOn: '2026-10-20',
        method: 'bank_transfer',
        reference: 'REF-42',
      },
    })
  })

  it('accepts the whole balance, and stores a blank reference as null', () => {
    expect(parsePayment(input({ amount: '120.50' }), invoice, today)).toEqual({
      values: expect.objectContaining({ amount: 12050, reference: null }),
    })
  })

  it('uses the currency’s decimals', () => {
    expect(
      parsePayment(
        input({ amount: '5000' }),
        { currency: 'JPY', balance: 5000 },
        today,
      ),
    ).toEqual({ values: expect.objectContaining({ amount: 5000 }) })
    expect(
      parsePayment(
        input({ amount: '50.5' }),
        { currency: 'JPY', balance: 5000 },
        today,
      ).fieldErrors,
    ).toEqual({ amount: 'Enter an amount, e.g. 120.50' })
  })

  it('refuses amounts that aren’t money, nothing, or more than is left', () => {
    const amountError = (amount: string) =>
      parsePayment(input({ amount }), invoice, today).fieldErrors?.amount
    expect(amountError('')).toBe('Enter an amount, e.g. 120.50')
    expect(amountError('-5')).toBe('Enter an amount, e.g. 120.50')
    expect(amountError('1.005')).toBe('Enter an amount, e.g. 120.50')
    expect(amountError('0')).toBe('Enter more than 0')
    expect(amountError('120.51')).toBe('That’s more than the €120.50 left')
  })

  it('refuses future dates, unknown methods and long references', () => {
    expect(
      parsePayment(
        input({
          receivedOn: '2026-10-22',
          method: 'bitcoin',
          reference: 'x'.repeat(201),
        }),
        invoice,
        today,
      ),
    ).toEqual({
      fieldErrors: {
        receivedOn: 'The payment date can’t be in the future',
        method: 'Pick how it was paid',
        reference: 'Keep it under 200 characters',
      },
    })
  })
})

describe('isPaymentMethod', () => {
  it('knows the methods, and nothing inherited', () => {
    expect(isPaymentMethod('cash')).toBe(true)
    expect(isPaymentMethod('stripe')).toBe(false)
    expect(isPaymentMethod('toString')).toBe(false)
  })
})
