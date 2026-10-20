import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listClients } from '@/lib/clients/queries'
import { countries } from '@/lib/locale-data'
import { requireOrganizationId } from '@/lib/session'
import { Plus, Search, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Form from 'next/form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Clients' }

const countryNames = new Map(countries.map(({ code, name }) => [code, name]))

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const [{ q }, organizationId] = await Promise.all([
    searchParams,
    requireOrganizationId(),
  ])
  const search = typeof q === 'string' ? q.trim() : ''
  const clients = await listClients(organizationId, search)

  const heading = (
    <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
  )

  if (!clients.length && !search) {
    return (
      <>
        {heading}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>
              Add the people and companies you invoice. You can pick them when
              you create an invoice.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/clients/new">
                <Plus data-icon="inline-start" />
                Add client
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {heading}
        <Button asChild>
          <Link href="/clients/new">
            <Plus data-icon="inline-start" />
            New client
          </Link>
        </Button>
      </div>
      <Form action="/clients" className="max-w-sm">
        <InputGroup>
          <InputGroupInput
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search by name or email"
            aria-label="Search clients"
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </Form>
      {clients.length ? (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[
                      client.city,
                      client.country && countryNames.get(client.country),
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No clients match “{search}”.</p>
      )}
    </>
  )
}
