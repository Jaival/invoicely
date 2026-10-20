'use client'

import {
  removeClient,
  saveClient,
  type ClientFormState,
} from '@/app/(app)/clients/actions'
import { SelectField, TextareaField, TextField } from '@/components/form-fields'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field'
import type { ClientInput } from '@/lib/clients/schema'
import { countries } from '@/lib/locale-data'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

type ClientFormProps = {
  // Omitted for a new client.
  id?: string
  client: ClientInput
}

export function ClientForm({ id, client }: ClientFormProps) {
  const router = useRouter()
  const [state, setState] = useState<ClientFormState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()

  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0]

  // Submitting through onSubmit rather than <form action> keeps what the
  // user typed when validation fails (form actions reset the fields).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveClient(state, formData)
      setState(result)
      if (result.status === 'success') {
        toast.success(id ? 'Client saved' : 'Client added')
        router.push('/clients')
      }
    })
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        {id && <input type="hidden" name="id" value={id} />}
        <CardHeader>
          <CardTitle>{id ? 'Edit client' : 'New client'}</CardTitle>
          <CardDescription>
            Name, address and tax ID appear on the invoices you send them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>Client</FieldLegend>
              <FieldGroup>
                <TextField
                  name="name"
                  label="Name"
                  defaultValue={client.name}
                  error={errorFor('name')}
                  description="A person or a company."
                  required
                />
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  defaultValue={client.email}
                  error={errorFor('email')}
                  description="Where invoices are sent."
                />
                <TextField
                  name="taxId"
                  label="Tax ID"
                  defaultValue={client.taxId}
                  error={errorFor('taxId')}
                  description="Their VAT, GST or other tax number, if any."
                />
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <FieldSet>
              <FieldLegend>Address</FieldLegend>
              <FieldGroup>
                <TextField
                  name="addressLine1"
                  label="Address line 1"
                  defaultValue={client.addressLine1}
                  error={errorFor('addressLine1')}
                />
                <TextField
                  name="addressLine2"
                  label="Address line 2"
                  defaultValue={client.addressLine2}
                  error={errorFor('addressLine2')}
                />
                <div className="grid gap-7 sm:grid-cols-2">
                  <TextField
                    name="city"
                    label="City"
                    defaultValue={client.city}
                    error={errorFor('city')}
                  />
                  <TextField
                    name="region"
                    label="State / region"
                    defaultValue={client.region}
                    error={errorFor('region')}
                  />
                  <TextField
                    name="postalCode"
                    label="Postal code"
                    defaultValue={client.postalCode}
                    error={errorFor('postalCode')}
                  />
                  <SelectField
                    name="country"
                    label="Country"
                    placeholder="Select a country"
                    options={countries}
                    defaultValue={client.country}
                    error={errorFor('country')}
                  />
                </div>
              </FieldGroup>
            </FieldSet>
            <FieldSeparator />
            <TextareaField
              name="notes"
              label="Notes"
              defaultValue={client.notes}
              error={errorFor('notes')}
              description="Only you see these. They never appear on invoices."
              rows={4}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {id ? 'Save' : 'Add client'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/clients">Cancel</Link>
          </Button>
          {state.status === 'error' && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          {id && <DeleteClient id={id} name={client.name} />}
        </CardFooter>
      </form>
    </Card>
  )
}

function DeleteClient({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onDelete(event: React.MouseEvent) {
    // Keep the dialog open until the delete finishes.
    event.preventDefault()
    startTransition(async () => {
      const result = await removeClient(id)
      if (result.status === 'error') {
        toast.error(result.message)
        return
      }
      toast.success('Client deleted')
      router.push('/clients')
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" className="ml-auto">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the client and their details. It can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onDelete}
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete client
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
