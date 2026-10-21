import { db } from '@/db'
import { client, invoice, invoiceCounter } from '@/db/schema'
import type { SortDirection, SortKey } from '@/lib/invoices/list'
import type { DisplayStatus } from '@/lib/invoices/status'
import { createClient, createOrganization } from '@/test/organizations'
import { eq } from 'drizzle-orm'
import { setTimeout as sleep } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'

import {
  countInvoicesByStatus,
  createInvoice,
  deleteDraft,
  getInvoice,
  listInvoices,
  markInvoicePaid,
  markInvoiceSent,
  markInvoiceUnpaid,
  updateDraft,
  voidInvoice,
  type InvoiceValues,
} from './queries'

// The business's today in these tests.
const TODAY = '2026-10-21'

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

describe('listInvoices', () => {
  it('lists the business’s invoices, newest first, with their clients', async () => {
    const { organizationId, clientId } = await setUp()
    const older = await createDraft(organizationId, clientId)
    const newer = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, older)

    expect(await listInvoices(organizationId, TODAY)).toEqual([
      expect.objectContaining({
        id: newer,
        number: null,
        status: 'draft',
        clientName: 'Test client',
        total: 27420,
      }),
      expect.objectContaining({
        id: older,
        number: 'INV-0001',
        status: 'sent',
      }),
    ])
  })

  // One invoice in each status, across two clients:
  //   INV-0001 Ada,     sent, due Oct 31  €100
  //   INV-0002 Babbage, sent, due Oct 10  €300 (overdue on TODAY)
  //   INV-0003 Ada,     paid              €50
  //   INV-0004 Babbage, void              €200
  //   draft    Babbage                    €400
  async function oneOfEach() {
    const organizationId = await createOrganization()
    const [ada, babbage] = await db
      .insert(client)
      .values([
        { organizationId, name: 'ada Analytics' },
        { organizationId, name: 'Babbage & Co' },
      ])
      .returning({ id: client.id })
    const create = async (
      clientId: string,
      euros: number,
      dueDate = '2026-10-31',
    ) => {
      const id = await createInvoice(organizationId, {
        ...values(clientId),
        dueDate,
        lines: [
          {
            description: 'Work',
            quantity: 1000,
            unitPrice: euros * 100,
            taxRate: 0,
            discountRate: 0,
          },
        ],
      })
      return id!
    }
    const send = async (id: string) => {
      await markInvoiceSent(organizationId, id)
      return id
    }

    const sent = await send(await create(ada.id, 100))
    const overdue = await send(await create(babbage.id, 300, '2026-10-10'))
    const paid = await send(await create(ada.id, 50))
    await markInvoicePaid(organizationId, paid, '2026-10-15')
    const voided = await send(await create(babbage.id, 200))
    await voidInvoice(organizationId, voided)
    const draft = await create(babbage.id, 400)
    return { organizationId, sent, overdue, paid, voided, draft }
  }

  const ids = (rows: { id: string }[]) => rows.map((row) => row.id)

  it('filters by status, working out overdue from the business’s today', async () => {
    const all = await oneOfEach()
    const list = (status: DisplayStatus, today = TODAY) =>
      listInvoices(all.organizationId, today, { status }).then(ids)

    expect(await list('draft')).toEqual([all.draft])
    expect(await list('sent')).toEqual([all.sent])
    expect(await list('overdue')).toEqual([all.overdue])
    expect(await list('paid')).toEqual([all.paid])
    expect(await list('void')).toEqual([all.voided])
    // Before its due date, the overdue one was just sent.
    expect(await list('sent', '2026-10-05')).toEqual([all.overdue, all.sent])
    expect(await list('overdue', '2026-10-05')).toEqual([])
  })

  it('searches numbers and client names, ignoring case', async () => {
    const all = await oneOfEach()
    const search = (term: string) =>
      listInvoices(all.organizationId, TODAY, { search: term }).then(ids)

    expect(await search('BABBAGE')).toEqual([
      all.draft,
      all.voided,
      all.overdue,
    ])
    expect(await search('inv-0003')).toEqual([all.paid])
    expect(await search('Ada a')).toEqual([all.paid, all.sent])
    // Wildcards are matched literally.
    expect(await search('%')).toEqual([])
    expect(await search('INV_0001')).toEqual([])
  })

  it('combines search and status', async () => {
    const all = await oneOfEach()
    expect(
      await listInvoices(all.organizationId, TODAY, {
        search: 'babbage',
        status: 'overdue',
      }).then(ids),
    ).toEqual([all.overdue])
  })

  it('sorts by each column, both ways', async () => {
    const all = await oneOfEach()
    const sorted = (sort: SortKey, dir: SortDirection) =>
      listInvoices(all.organizationId, TODAY, { sort, dir }).then(ids)

    // Drafts have no number, so they come last either way.
    expect(await sorted('number', 'asc')).toEqual([
      all.sent,
      all.overdue,
      all.paid,
      all.voided,
      all.draft,
    ])
    expect(await sorted('number', 'desc')).toEqual([
      all.voided,
      all.paid,
      all.overdue,
      all.sent,
      all.draft,
    ])
    // Ignoring case: "ada Analytics" before "Babbage & Co", newest first
    // within each.
    expect(await sorted('client', 'asc')).toEqual([
      all.paid,
      all.sent,
      all.draft,
      all.voided,
      all.overdue,
    ])
    expect(await sorted('total', 'desc')).toEqual([
      all.draft,
      all.overdue,
      all.voided,
      all.sent,
      all.paid,
    ])
    expect(await sorted('due', 'asc')).toEqual([
      all.overdue,
      all.draft,
      all.voided,
      all.paid,
      all.sent,
    ])
  })

  it('counts the matching invoices in each status', async () => {
    const all = await oneOfEach()

    expect(await countInvoicesByStatus(all.organizationId, TODAY)).toEqual({
      draft: 1,
      sent: 1,
      overdue: 1,
      paid: 1,
      void: 1,
    })
    expect(
      await countInvoicesByStatus(all.organizationId, TODAY, 'babbage'),
    ).toEqual({ draft: 1, overdue: 1, void: 1 })
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

describe('sending', () => {
  it('copies the business and client details as they are', async () => {
    const { organizationId, clientId } = await setUp('ACME')
    const id = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, id)

    // Later edits to the client don't change what was sent.
    await db
      .update(client)
      .set({ name: 'Renamed client', city: 'Berlin' })
      .where(eq(client.id, clientId))

    const sent = await getInvoice(organizationId, id)
    expect(sent?.sentAt).toBeInstanceOf(Date)
    expect(sent?.clientDetails).toEqual({
      name: 'Test client',
      email: null,
      taxId: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      country: null,
    })
    expect(sent?.businessDetails).toMatchObject({
      name: 'Test business',
      logoUrl: null,
    })
    const [listed] = await listInvoices(organizationId, TODAY)
    expect(listed.clientName).toBe('Test client')
  })

  it('uses the organization�s name when it has no business profile', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, id)

    expect((await getInvoice(organizationId, id))?.businessDetails).toEqual(
      expect.objectContaining({ name: 'Test business', email: null }),
    )
  })

  it('refuses a draft with no lines', async () => {
    const { organizationId, clientId } = await setUp()
    const id = await createInvoice(organizationId, {
      ...values(clientId),
      lines: [],
    })

    expect(await markInvoiceSent(organizationId, id!)).toBeUndefined()
    expect(await getInvoice(organizationId, id!)).toMatchObject({
      status: 'draft',
      number: null,
    })
  })
})

describe('payment and voiding', () => {
  async function sentInvoice() {
    const { organizationId, clientId } = await setUp()
    const id = await createDraft(organizationId, clientId)
    await markInvoiceSent(organizationId, id)
    return { organizationId, id }
  }

  it('marks a sent invoice paid, and back to unpaid', async () => {
    const { organizationId, id } = await sentInvoice()

    expect(await markInvoicePaid(organizationId, id, '2026-10-15')).toBe(true)
    expect(await getInvoice(organizationId, id)).toMatchObject({
      status: 'paid',
      paidOn: '2026-10-15',
    })
    // Already paid.
    expect(await markInvoicePaid(organizationId, id, '2026-10-16')).toBe(false)

    expect(await markInvoiceUnpaid(organizationId, id)).toBe(true)
    expect(await getInvoice(organizationId, id)).toMatchObject({
      status: 'sent',
      paidOn: null,
    })
    expect(await markInvoiceUnpaid(organizationId, id)).toBe(false)
  })

  it('voids a sent invoice for good, keeping its number', async () => {
    const { organizationId, id } = await sentInvoice()

    expect(await voidInvoice(organizationId, id)).toBe(true)
    const voided = await getInvoice(organizationId, id)
    expect(voided).toMatchObject({ status: 'void', number: 'INV-0001' })
    expect(voided?.voidedAt).toBeInstanceOf(Date)

    expect(await voidInvoice(organizationId, id)).toBe(false)
    expect(await markInvoicePaid(organizationId, id, '2026-10-15')).toBe(false)
    expect(await markInvoiceUnpaid(organizationId, id)).toBe(false)
  })

  it('only voids invoices that are sent and unpaid', async () => {
    const { organizationId, id } = await sentInvoice()
    await markInvoicePaid(organizationId, id, '2026-10-15')
    expect(await voidInvoice(organizationId, id)).toBe(false)

    const other = await setUp()
    const draftId = await createDraft(other.organizationId, other.clientId)
    expect(await voidInvoice(other.organizationId, draftId)).toBe(false)
    expect(
      await markInvoicePaid(other.organizationId, draftId, '2026-10-15'),
    ).toBe(false)
  })

  it('keeps each status�s dates consistent in the database', async () => {
    const { id } = await sentInvoice()

    await expect(
      db.update(invoice).set({ status: 'paid' }).where(eq(invoice.id, id)),
    ).rejects.toThrow()
    await expect(
      db
        .update(invoice)
        .set({ paidOn: '2026-10-15' })
        .where(eq(invoice.id, id)),
    ).rejects.toThrow()
    await expect(
      db.update(invoice).set({ clientDetails: null }).where(eq(invoice.id, id)),
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
    expect(await listInvoices(theirs.organizationId, TODAY)).toEqual([])
    expect(await countInvoicesByStatus(theirs.organizationId, TODAY)).toEqual(
      {},
    )
    expect(
      await updateDraft(theirs.organizationId, id, values(theirs.clientId)),
    ).toBe(false)
    expect(await markInvoiceSent(theirs.organizationId, id)).toBeUndefined()
    expect(await deleteDraft(theirs.organizationId, id)).toBe(false)

    await markInvoiceSent(mine.organizationId, id)
    expect(await markInvoicePaid(theirs.organizationId, id, '2026-10-15')).toBe(
      false,
    )
    expect(await voidInvoice(theirs.organizationId, id)).toBe(false)
    await markInvoicePaid(mine.organizationId, id, '2026-10-15')
    expect(await markInvoiceUnpaid(theirs.organizationId, id)).toBe(false)

    expect(await getInvoice(mine.organizationId, id)).toMatchObject({
      status: 'paid',
      total: 27420,
    })
  })
})
