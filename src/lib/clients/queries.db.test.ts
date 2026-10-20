import { db } from '@/db'
import { organization } from '@/db/schema'
import { createInvoice } from '@/lib/invoices/queries'
import { createClient, createOrganization } from '@/test/organizations'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { deleteClient, getClient } from './queries'

const draft = (clientId: string) => ({
  clientId,
  currency: 'EUR',
  issueDate: '2026-10-01',
  dueDate: '2026-10-31',
  notes: null,
  terms: null,
  lines: [],
})

describe('deleteClient', () => {
  it('deletes a client without invoices', async () => {
    const organizationId = await createOrganization()
    const clientId = await createClient(organizationId)

    expect(await deleteClient(organizationId, clientId)).toBe('deleted')
    expect(await getClient(organizationId, clientId)).toBeUndefined()
  })

  it('keeps a client that has invoices', async () => {
    const organizationId = await createOrganization()
    const clientId = await createClient(organizationId)
    await createInvoice(organizationId, draft(clientId))

    expect(await deleteClient(organizationId, clientId)).toBe('has-invoices')
    expect(await getClient(organizationId, clientId)).toBeDefined()
  })

  it('leaves other businesses’ clients alone', async () => {
    const organizationId = await createOrganization()
    const clientId = await createClient(organizationId)
    const other = await createOrganization()

    expect(await deleteClient(other, clientId)).toBe('not-found')
    expect(await getClient(organizationId, clientId)).toBeDefined()
  })
})

it('deleting a business deletes its clients and invoices', async () => {
  const organizationId = await createOrganization()
  const clientId = await createClient(organizationId)
  await createInvoice(organizationId, draft(clientId))

  await db.delete(organization).where(eq(organization.id, organizationId))

  expect(await getClient(organizationId, clientId)).toBeUndefined()
})
