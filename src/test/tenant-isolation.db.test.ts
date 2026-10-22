import { db } from '@/db'
import * as schema from '@/db/schema'
import * as authSchema from '@/db/schema/auth'
import type { ClientValues } from '@/lib/clients/schema'
import type { BusinessProfileValues } from '@/lib/business-profile'
import { today } from '@/lib/dates'
import * as clients from '@/lib/clients/queries'
import * as invoices from '@/lib/invoices/queries'
import * as organizations from '@/lib/organization'
import { createOrganization, createUser } from '@/test/organizations'
import { asc, eq, inArray, is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

// One business must never see or change another's data. Every function in
// the modules that touch the database (see data-access.test.ts) has a probe
// below that calls it as another business, aimed at data the call would
// read or change if it weren't scoped to the organization. After each
// probe, the first business's data must be exactly as it was.

const {
  businessProfile,
  client,
  invoice,
  invoiceCounter,
  invoiceEvent,
  invoiceLine,
  member,
  organization,
  user,
} = schema

// The business's today in these tests.
const TODAY = '2026-10-21'

// Tables owned through the table they reference rather than directly by an
// organization.
const ownedThrough: Record<string, string> = {
  invoice_line: 'invoice',
  invoice_event: 'invoice',
}

describe('schema', () => {
  // Better Auth's tables; membership decides who belongs to an organization.
  const authTables = new Set(
    Object.values(authSchema)
      .filter((table) => is(table, PgTable))
      .map((table) => getTableConfig(table).name),
  )
  const businessTables = Object.values(schema)
    .filter((table) => is(table, PgTable))
    .map((table) => getTableConfig(table))
    .filter((table) => !authTables.has(table.name))

  it.each(businessTables.map((table) => [table.name, table] as const))(
    '%s belongs to an organization and is deleted with it',
    (name, table) => {
      const owner = ownedThrough[name] ?? 'organization'
      const references = table.foreignKeys.map((foreignKey) => ({
        table: getTableConfig(foreignKey.reference().foreignTable).name,
        onDelete: foreignKey.onDelete,
      }))
      expect(references).toContainEqual({ table: owner, onDelete: 'cascade' })
    },
  )
})

type Business = {
  organizationId: string
  clientId: string
  sentId: string
}

// Mine has something in every state a query could act on.
type Mine = Business & {
  // A client without invoices, so deleting it would succeed.
  idleClientId: string
  draftId: string
  paidId: string
}

let mine: Mine
let theirs: Business
let before: Awaited<ReturnType<typeof snapshot>>

beforeAll(async () => {
  const me = await business('Mine', 'MINE', 'Pacific/Kiritimati')
  const draftId = await createInvoice(me.organizationId, me.clientId)
  const paidId = await createInvoice(me.organizationId, me.clientId)
  await invoices.markInvoiceSent(me.organizationId, paidId)
  await invoices.markInvoicePaid(me.organizationId, paidId, '2026-10-15')
  mine = {
    ...me,
    idleClientId: await clients.createClient(
      me.organizationId,
      clientValues('Mine idle client'),
    ),
    draftId,
    paidId,
  }
  theirs = await business('Their', 'THEIRS', 'UTC')
  before = await snapshot(mine.organizationId)
})

afterEach(async () => {
  const expected = before
  // Compared against the last probe's, so a leak fails only the probe that
  // caused it.
  before = await snapshot(mine.organizationId)
  expect(before).toEqual(expected)
})

type Probe = () => Promise<void>

const clientProbes: Record<keyof typeof clients, Probe> = {
  async listClients() {
    const listed = await clients.listClients(theirs.organizationId)
    expect(listed.map((row) => row.id)).not.toContain(mine.clientId)
    expect(await clients.listClients(theirs.organizationId, 'Mine')).toEqual([])
  },
  async getClient() {
    expect(
      await clients.getClient(theirs.organizationId, mine.clientId),
    ).toBeUndefined()
  },
  async createClient() {
    const id = await clients.createClient(
      theirs.organizationId,
      clientValues('Their new client'),
    )
    expect(await clients.getClient(mine.organizationId, id)).toBeUndefined()
    expect(await clients.getClient(theirs.organizationId, id)).toBeDefined()
  },
  async updateClient() {
    expect(
      await clients.updateClient(
        theirs.organizationId,
        mine.idleClientId,
        clientValues('Taken over'),
      ),
    ).toBe(false)
  },
  async deleteClient() {
    expect(
      await clients.deleteClient(theirs.organizationId, mine.idleClientId),
    ).toBe('not-found')
  },
}

const invoiceProbes: Record<keyof typeof invoices, Probe> = {
  async listInvoices() {
    const list = (search?: string) =>
      invoices
        .listInvoices(theirs.organizationId, TODAY, { search })
        .then((rows) => rows.map((row) => row.id))
    expect(await list()).toEqual([theirs.sentId])
    expect(await list('MINE-0001')).toEqual([])
    expect(await list('Mine client')).toEqual([])
  },
  async countInvoicesByStatus() {
    expect(
      await invoices.countInvoicesByStatus(theirs.organizationId, TODAY),
    ).toEqual({ sent: 1 })
    expect(
      await invoices.countInvoicesByStatus(
        theirs.organizationId,
        TODAY,
        'Mine',
      ),
    ).toEqual({})
  },
  async outstandingTotals() {
    // Only their own sent invoice, not mine too.
    expect(
      await invoices.outstandingTotals(theirs.organizationId, TODAY),
    ).toEqual([{ currency: 'EUR', outstanding: 10000, overdue: 0 }])
  },
  async getInvoice() {
    for (const id of [mine.draftId, mine.sentId, mine.paidId]) {
      expect(
        await invoices.getInvoice(theirs.organizationId, id),
      ).toBeUndefined()
    }
  },
  async getPublicInvoice() {
    // Only the token opens an invoice, and only its own.
    const [{ publicToken }] = await db
      .select({ publicToken: invoice.publicToken })
      .from(invoice)
      .where(eq(invoice.id, theirs.sentId))
    expect((await invoices.getPublicInvoice(publicToken!))?.id).toBe(
      theirs.sentId,
    )
    expect(await invoices.getPublicInvoice('a'.repeat(32))).toBeUndefined()
    expect(await invoices.getPublicInvoice('')).toBeUndefined()
  },
  async createInvoice() {
    // Neither business can bill the other's client.
    expect(
      await invoices.createInvoice(
        theirs.organizationId,
        invoiceValues(mine.clientId),
      ),
    ).toBeUndefined()
    expect(
      await invoices.createInvoice(
        mine.organizationId,
        invoiceValues(theirs.clientId),
      ),
    ).toBeUndefined()
  },
  async duplicateInvoice() {
    expect(
      await invoices.duplicateInvoice(
        theirs.organizationId,
        mine.sentId,
        TODAY,
      ),
    ).toBeUndefined()
  },
  async updateDraft() {
    expect(
      await invoices.updateDraft(
        theirs.organizationId,
        mine.draftId,
        invoiceValues(theirs.clientId),
      ),
    ).toBe(false)
    expect(
      await invoices.updateDraft(
        mine.organizationId,
        mine.draftId,
        invoiceValues(theirs.clientId),
      ),
    ).toBe(false)
  },
  async deleteDraft() {
    expect(
      await invoices.deleteDraft(theirs.organizationId, mine.draftId),
    ).toBe(false)
  },
  async markInvoiceSent() {
    expect(
      await invoices.markInvoiceSent(theirs.organizationId, mine.draftId),
    ).toBeUndefined()
  },
  async markInvoicePaid() {
    expect(
      await invoices.markInvoicePaid(theirs.organizationId, mine.sentId, TODAY),
    ).toBe(false)
  },
  async markInvoiceUnpaid() {
    expect(
      await invoices.markInvoiceUnpaid(theirs.organizationId, mine.paidId),
    ).toBe(false)
  },
  async voidInvoice() {
    expect(await invoices.voidInvoice(theirs.organizationId, mine.sentId)).toBe(
      false,
    )
  },
  async recordInvoiceEmailed() {
    expect(
      await invoices.recordInvoiceEmailed(
        theirs.organizationId,
        mine.sentId,
        'them@example.com',
      ),
    ).toBe(false)
  },
  async listInvoiceEvents() {
    expect(
      await invoices.listInvoiceEvents(theirs.organizationId, mine.paidId),
    ).toEqual([])
    expect(
      await invoices.listInvoiceEvents(theirs.organizationId, theirs.sentId),
    ).toEqual([expect.objectContaining({ type: 'sent' })])
  },
}

const organizationProbes: Record<keyof typeof organizations, Probe> = {
  async ensurePersonalOrganization() {
    // Even with the same name as an existing business, a new user gets a
    // business of their own.
    const userId = await createUser('Mine')
    const organizationId =
      await organizations.ensurePersonalOrganization(userId)
    expect(organizationId).not.toBe(mine.organizationId)
    expect(await organizations.ensurePersonalOrganization(userId)).toBe(
      organizationId,
    )
    const members = await db
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(eq(member.organizationId, organizationId))
    expect(members).toEqual([{ userId, role: 'owner' }])
  },
  async getActiveOrganization() {
    expect(
      (await organizations.getActiveOrganization(theirs.organizationId))?.id,
    ).toBe(theirs.organizationId)
  },
  async getBusinessProfile() {
    expect(
      await organizations.getBusinessProfile(theirs.organizationId),
    ).toMatchObject({
      organizationId: theirs.organizationId,
      invoicePrefix: 'THEIRS',
    })
  },
  async businessToday() {
    // Theirs is in UTC, mine in Kiritimati (UTC+14).
    expect(await organizations.businessToday(theirs.organizationId)).toBe(
      today(),
    )
  },
  async getPublicAppearance() {
    // Their owner uses Brutal, and their invoices match it. Mine has no
    // owner and stays Clean.
    const ownerId = await createUser('Their owner')
    await db
      .update(user)
      .set({ uiStyle: 'brutal', uiPalette: 'sunshine' })
      .where(eq(user.id, ownerId))
    await db.insert(member).values({
      organizationId: theirs.organizationId,
      userId: ownerId,
      role: 'owner',
      createdAt: new Date(),
    })
    await organizations.upsertBusinessProfile(theirs.organizationId, {
      ...profileValues('Their business', 'THEIRS'),
      publicStyle: 'match',
    })
    expect(
      await organizations.getPublicAppearance(theirs.organizationId),
    ).toEqual({ style: 'brutal', palette: 'sunshine' })
  },
  async upsertBusinessProfile() {
    await organizations.upsertBusinessProfile(
      theirs.organizationId,
      profileValues('Their renamed business', 'THEIRS'),
    )
    expect(
      await organizations.getBusinessProfile(theirs.organizationId),
    ).toMatchObject({ name: 'Their renamed business' })
  },
}

describe.each([
  ['@/lib/clients/queries', clients, clientProbes],
  ['@/lib/invoices/queries', invoices, invoiceProbes],
  ['@/lib/organization', organizations, organizationProbes],
] as const)('%s, used by another business', (_, module, probes) => {
  it('has a probe for every function', () => {
    expect(Object.keys(probes).toSorted()).toEqual(
      Object.keys(module).toSorted(),
    )
  })

  it.each(Object.entries(probes))('%s', (_, probe) => probe())
})

// A business with a profile, a client and a sent invoice.
async function business(
  name: string,
  invoicePrefix: string,
  timeZone: string,
): Promise<Business> {
  const organizationId = await createOrganization()
  await organizations.upsertBusinessProfile(
    organizationId,
    profileValues(`${name} business`, invoicePrefix, timeZone),
  )
  const clientId = await clients.createClient(
    organizationId,
    clientValues(`${name} client`),
  )
  const sentId = await createInvoice(organizationId, clientId)
  await invoices.markInvoiceSent(organizationId, sentId)
  return { organizationId, clientId, sentId }
}

async function createInvoice(organizationId: string, clientId: string) {
  const id = await invoices.createInvoice(
    organizationId,
    invoiceValues(clientId),
  )
  if (!id) throw new Error('Invoice was not created')
  return id
}

// Everything the business owns, to compare before and after each probe.
async function snapshot(organizationId: string) {
  const invoiceRows = await db
    .select()
    .from(invoice)
    .where(eq(invoice.organizationId, organizationId))
    .orderBy(asc(invoice.id))
  return {
    organization: await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId)),
    members: await db
      .select()
      .from(member)
      .where(eq(member.organizationId, organizationId))
      .orderBy(asc(member.id)),
    profile: await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.organizationId, organizationId)),
    clients: await db
      .select()
      .from(client)
      .where(eq(client.organizationId, organizationId))
      .orderBy(asc(client.id)),
    invoices: invoiceRows,
    lines: await db
      .select()
      .from(invoiceLine)
      .where(
        inArray(
          invoiceLine.invoiceId,
          invoiceRows.map((row) => row.id),
        ),
      )
      .orderBy(asc(invoiceLine.id)),
    events: await db
      .select()
      .from(invoiceEvent)
      .where(
        inArray(
          invoiceEvent.invoiceId,
          invoiceRows.map((row) => row.id),
        ),
      )
      .orderBy(asc(invoiceEvent.id)),
    counter: await db
      .select()
      .from(invoiceCounter)
      .where(eq(invoiceCounter.organizationId, organizationId)),
  }
}

function clientValues(name: string): ClientValues {
  return {
    name,
    email: null,
    taxId: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    notes: null,
  }
}

function profileValues(
  name: string,
  invoicePrefix: string,
  timeZone = 'UTC',
): BusinessProfileValues {
  return {
    name,
    email: null,
    taxId: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    defaultCurrency: 'EUR',
    invoicePrefix,
    timeZone,
    publicStyle: 'clean',
  }
}

function invoiceValues(clientId: string): invoices.InvoiceValues {
  return {
    clientId,
    currency: 'EUR',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    notes: null,
    terms: null,
    lines: [
      {
        description: 'Work',
        quantity: 1000,
        unitPrice: 10000,
        taxRate: 0,
        discountRate: 0,
      },
    ],
  }
}
