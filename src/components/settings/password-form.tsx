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
import { useState } from 'react'
import { toast } from 'sonner'

export function PasswordForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)

    setPending(true)
    setError(undefined)
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get('currentPassword')),
      newPassword: String(form.get('newPassword')),
      // A changed password should end sessions on other devices.
      revokeOtherSessions: true,
    })
    setPending(false)

    if (error) {
      setError(error.message ?? 'Could not change your password.')
      return
    }
    formElement.reset()
    toast.success('Password changed')
  }

  const invalid = error ? true : undefined

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing your password signs you out on other devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={invalid}>
              <FieldLabel htmlFor="currentPassword">
                Current password
              </FieldLabel>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={invalid}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldDescription>At least 8 characters.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
