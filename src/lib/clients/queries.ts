import { db } from '@/db'
import { client } from '@/db/schema'
import type { ClientValues } from '@/lib/clients/schema'
import { containsPattern } from '@/lib/search'
import { and, asc, eq, ilike, or } from 'drizzle-orm'

// Every query takes the organization, so one business can never read or
// change another's clients. Callers pass the session's organization.

export async function listClients(organizationId: string, search = '') {
  const term = search.trim()
  const pattern = containsPattern(term)
  return db
    .select({
      id: client.id,
      name: client.name,
      email: client.email,
      city: client.city,
      country: client.country,
    })
    .from(client)
    .where(
      and(
        eq(client.organizationId, organizationId),
        term
          ? or(ilike(client.name, pattern), ilike(client.email, pattern))
          : undefined,
      ),
    )
    .orderBy(asc(client.name))
}

export async function getClient(organizationId: string, id: string) {
  const [found] = await db
    .select()
    .from(client)
    .where(and(eq(client.organizationId, organizationId), eq(client.id, id)))
  return found
}

export async function createClient(
  organizationId: string,
  values: ClientValues,
) {
  const [created] = await db
    .insert(client)
    .values({ organizationId, ...values })
    .returning({ id: client.id })
  return created.id
}

// Returns false when the client doesn't exist in this organization.
export async function updateClient(
  organizationId: string,
  id: string,
  values: ClientValues,
) {
  const updated = await db
    .update(client)
    .set(values)
    .where(and(eq(client.organizationId, organizationId), eq(client.id, id)))
    .returning({ id: client.id })
  return updated.length > 0
}

export async function deleteClient(organizationId: string, id: string) {
  const deleted = await db
    .delete(client)
    .where(and(eq(client.organizationId, organizationId), eq(client.id, id)))
    .returning({ id: client.id })
  return deleted.length > 0
}
