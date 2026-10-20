import { db } from '@/db'
import { invoice, invoiceCounter } from '@/db/schema'
import { createClient, createOrganization } from '@/test/organizations'
import { eq } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'

import {
  createInvoice,
  deleteDraft,
  getInvoice,
  markInvoiceSent,
  updateDraft,
  type InvoiceValues,
} from './queries'

async function setUp(invoicePrefix?: string) {
  const organizationId = await createOrganization(invoicePrefix)
  const clientId = await createClient(organizationId)
  return { organizationId, clientId }
}

function values(clientId: string): InvoiceValues {
  return {
    clientId,
    currency: 'EUR',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    notes: 'Thanks for your business',
    terms: null,
    lines: [
      // 2 × €100, 10% off, 19% tax: net 180.00, tax 34.20
      {
        description: 'Design',
        quantity: 2000,
        unitPrice: 10000,
        taxRate: 1900,
        discountRate: 1000,
      },
      // 1.5 × €40, no tax: net 60.00
      {
        description: 'Hosting',
        quantity: 1500,
        unitPrice: 4000,
        taxRate: 0,
        discountRate: 0,
      },
    ],
  }
}

// Runs `send` while another transaction holds the business's invoice
// counter, so every send it starts is in flight at once when the counter is
// released, however the connection pool schedules them.
async function whileCounterLocked<T>(
  organizationId: string,
  send: () => Promise<T>,
) {
  await db
    .insert(invoiceCounter)
    .values({ organizationId, lastSequence: 0 })
    .onConflictDoNothing()
  let sent: Promise<T> | undefined
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(invoiceCounter)
      .where(eq(invoiceCounter.organizationId, organizationId))
      .for('update')
    sent = send()
    await sleep(1000)
  })
  return sent!
}

async function createDraft(organizationId: string, clientId: string) {
  const id = await createInvoice(organizationId, values(clientId))
  if (!id) throw new Error('Draft was not created')
  return id
}

describe('drafts', () => {
  it('saves the lines in order with their totals', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)

    const saved = await getInvoice(organizationId, id)
    expect(saved).toMatchObject({
      status: 'draft',
      number: null,
      sequence: null,
      currency: 'EUR',
      issueDate: '2026-10-01',
      dueDate: '2026-10-31',
      subtotal: 26000,
      discount: 2000,
      tax: 3420,
      total: 27420,
    })
    expect(saved?.lines.map((line) => line.description)).toEqual([
      'Design',
      'Hosting',
    ])
    expect(saved?.lines[0]).toMatchObject({
      position: 0,
      quantity: 2000,
      unitPrice: 10000,
      taxRate: 1900,
      discountRate: 1000,
    })
  })

  it('replaces the lines and totals when updated', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)

    const updated = await updateDraft(organizationId, id, {
      ...values(clientId),
      lines: [
        {
          description: 'Consulting',
          quantity: 1000,
          unitPrice: 5000,
          taxRate: 0,
          discountRate: 0,
        },
      ],
    })

    expect(updated).toBe(true)
    const saved = await getInvoice(organizationId, id)
    expect(saved?.lines.map((line) => line.description)).toEqual(['Consulting'])
    expect(saved).toMatchObject({ subtotal: 5000, tax: 0, total: 5000 })
  })

  it('can have no lines yet', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createInvoice(organizationId, {
      ...values(clientId),
      lines: [],
    })

    const saved = await getInvoice(organizationId, id!)
    expect(saved).toMatchObject({ lines: [], total: 0 })
  })

  it('can be deleted', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)

    expect(await deleteDraft(organizationId, id)).toBe(true)
    expect(await getInvoice(organizationId, id)).toBeUndefined()
  })
})

describe('numbering', () => {
  it('numbers invoices per business when they are sent', async () => {
    const a = await setUp('ACME')
    const b = await setUp()
    const a1 = await createDraft(a.organizationId, a.clientId)
    const a2 = await createDraft(a.organizationId, a.clientId)
    const b1 = await createDraft(b.organizationId, b.clientId)

    // Sent order decides the number, not creation order.
    expect(await markInvoiceSent(a.organizationId, a2)).toBe('ACME-0001')
    expect(await markInvoiceSent(b.organizationId, b1)).toBe('INV-0001')
    expect(await markInvoiceSent(a.organizationId, a1)).toBe('ACME-0002')

    expect(await getInvoice(a.organizationId, a1)).toMatchObject({
      status: 'sent',
      sequence: 2,
      number: 'ACME-0002',
    })
  })

  it('leaves no gaps when drafts are deleted', async () => {
    const { organizationId, clientId } = await setUp()
    const deleted = await createDraft(organizationId, clientId)
    const kept = await createDraft(organizationId, clientId)
    await deleteDraft(organizationId, deleted)

    expect(await markInvoiceSent(organizationId, kept)).toBe('INV-0001')
  })

  it('hands out each number once when invoices are sent at the same time', async () => {
    const { organizationId, clientId } = await setUp()
    const ids = await Promise.all(
      Array.from({ length: 8 }, () => createDraft(organizationId, clientId)),
    )

    const numbers = await whileCounterLocked(organizationId, () =>
      Promise.all(ids.map((id) => markInvoiceSent(organizationId, id))),
    )

    expect(numbers.toSorted()).toEqual(
      Array.from({ length: 8 }, (_, i) => `INV-000${i + 1}`),
    )
  })

  it('numbers an invoice sent twice at the same time once', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)

    const results = await whileCounterLocked(organizationId, () =>
      Promise.all([
        markInvoiceSent(organizationId, id),
        markInvoiceSent(organizationId, id),
      ]),
    )

    expect(results.toSorted()).toEqual(['INV-0001', undefined])
    const next = await createDraft(organizationId, clientId)
    expect(await markInvoiceSent(organizationId, next)).toBe('INV-0002')
  })

  it('keeps sent invoices as they are', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, id)

    expect(await updateDraft(organizationId, id, values(clientId))).toBe(false)
    expect(await deleteDraft(organizationId, id)).toBe(false)
    expect(await markInvoiceSent(organizationId, id)).toBeUndefined()
    expect(await getInvoice(organizationId, id)).toMatchObject({
      number: 'INV-0001',
    })
  })

  it('never lets a sent invoice return to draft', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, id)

    await expect(
      db.update(invoice).set({ status: 'draft' }).where(eq(invoice.id, id)),
    ).rejects.toThrow()
  })
})

describe('privacy', () => {
  it('only bills clients of the same business', async () => {
    const mine = await setUp()
    const theirs = await setUp()

    expect(
      await createInvoice(mine.organizationId, values(theirs.clientId)),
    ).toBeUndefined()

    const id = await createDraft(mine.organizationId, mine.clientId)
    expect(
      await updateDraft(mine.organizationId, id, values(theirs.clientId)),
    ).toBe(false)
  })

  it('hides invoices from other businesses', async () => {
    const mine = await setUp()
    const theirs = await setUp()
    const id = await createDraft(mine.organizationId, mine.clientId)

    expect(await getInvoice(theirs.organizationId, id)).toBeUndefined()
    expect(
      await updateDraft(theirs.organizationId, id, values(theirs.clientId)),
    ).toBe(false)
    expect(await markInvoiceSent(theirs.organizationId, id)).toBeUndefined()
    expect(await deleteDraft(theirs.organizationId, id)).toBe(false)

    expect(await getInvoice(mine.organizationId, id)).toMatchObject({
      status: 'draft',
      total: 27420,
    })
  })
})
