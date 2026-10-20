'use client'

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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type ProfileFormProps = { name: string; email: string }

export function ProfileForm({ name, email }: ProfileFormProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setPending(true)
    setError(undefined)
    const { error } = await authClient.updateUser({
      name: String(form.get('name')).trim(),
    })
    setPending(false)

    if (error) {
      setError(error.message ?? 'Could not save your profile.')
      return
    }
    toast.success('Profile saved')
    // The sidebar shows the name, so re-render the server components.
    router.refresh()
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in Invoicely.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                defaultValue={name}
                maxLength={100}
                required
                aria-invalid={error ? true : undefined}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" value={email} disabled readOnly />
              <FieldDescription>
                Your sign-in email can&apos;t be changed yet.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
