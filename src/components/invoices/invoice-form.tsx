'use client'

import {
  saveInvoice,
  sendInvoice,
  type InvoiceFormState,
} from '@/app/(app)/invoices/actions'
import { SelectField, TextareaField, TextField } from '@/components/form-fields'
import { DeleteDraftDialog } from '@/components/invoices/invoice-dialogs'
import { InvoiceTotalsList } from '@/components/invoices/invoice-totals'
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  MAX_LINES,
  previewTotals,
  type InvoiceInput,
  type LineInput,
} from '@/lib/invoices/schema'
import { currencies, type Option } from '@/lib/locale-data'
import { formatMoney } from '@/lib/money'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

type InvoiceFormProps = {
  // Omitted for a new invoice.
  id?: string
  invoice: InvoiceInput
  clients: Option[]
}

// Columns of a line on wider screens; the header row shares them.
const lineGrid =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_7rem_4.5rem_4.5rem_7rem_2.25rem] sm:items-start sm:gap-2'

export function InvoiceForm({ id, invoice, clients }: InvoiceFormProps) {
  const router = useRouter()
  const [state, setState] = useState<InvoiceFormState>({ status: 'idle' })
  const [pending, startTransition] = useTransition()
  // Lines have no id until saved, so each gets a key: its starting position,
  // then a count for added lines. Server and browser number them the same,
  // so the input ids built from them hydrate cleanly.
  const [values, setValues] = useState(() => ({
    ...invoice,
    lines: invoice.lines.map((line, index) => ({ ...line, key: index })),
  }))
  const nextKey = useRef(invoice.lines.length)
  const formId = useId()

  const errorFor = (path: string) => state.fieldErrors?.[path]
  const totals = previewTotals(values.currency, values.lines)
  const money = (minor: number) => formatMoney(minor, values.currency)

  const set = (field: keyof InvoiceInput) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))

  function setLine(key: number, field: keyof LineInput, value: string) {
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === key ? { ...line, [field]: value } : line,
      ),
    }))
  }

  // Errors are keyed by line position, which adding or removing lines
  // shifts, so those clear the line errors until the next save.
  function clearLineErrors() {
    setState((current) => ({
      ...current,
      fieldErrors: Object.fromEntries(
        Object.entries(current.fieldErrors ?? {}).filter(
          ([path]) => !path.startsWith('lines'),
        ),
      ),
    }))
  }

  function addLine() {
    const key = nextKey.current++
    setValues((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          key,
          description: '',
          quantity: '1',
          unitPrice: '',
          // Most invoices use one tax rate throughout.
          taxRate: current.lines.at(-1)?.taxRate ?? '',
          discountRate: '',
        },
      ],
    }))
    clearLineErrors()
  }

  function removeLine(key: number) {
    setValues((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.key !== key),
    }))
    clearLineErrors()
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      // Parsing on the server drops the lines' React keys.
      const result = await saveInvoice(id, values)
      setState(result)
      if (result.status === 'success') {
        toast.success('Draft saved')
        router.push('/invoices')
      }
    })
  }

  // Saves what's in the editor, then sends it. Resolves once done, so the
  // confirmation stays open until then.
  async function onSend() {
    const result = await sendInvoice(id, values)
    setState(result)
    if (result.status === 'success') {
      if (result.emailedTo) {
        toast.success(`${result.number} sent to ${result.emailedTo}`)
      } else {
        toast.success(`${result.number} marked as sent`, {
          description: 'Not emailed: copy its link to share it.',
        })
      }
      router.push(`/invoices/${result.id}`)
    }
    return result.status === 'success'
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <CardHeader>
          <CardTitle>{id ? 'Edit draft' : 'New invoice'}</CardTitle>
          <CardDescription>
            Drafts can be changed freely. The invoice gets its number when you
            send it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-7 sm:grid-cols-2">
              <SelectField
                name="clientId"
                label="Client"
                placeholder="Select a client"
                options={clients}
                defaultValue={values.clientId}
                onValueChange={set('clientId')}
                error={errorFor('clientId')}
              />
              <SelectField
                name="currency"
                label="Currency"
                placeholder="Select a currency"
                options={currencies}
                defaultValue={values.currency}
                onValueChange={set('currency')}
                error={errorFor('currency')}
                showCode
              />
              <TextField
                name="issueDate"
                label="Issue date"
                type="date"
                value={values.issueDate}
                onChange={(event) => set('issueDate')(event.target.value)}
                error={errorFor('issueDate')}
              />
              <TextField
                name="dueDate"
                label="Due date"
                type="date"
                value={values.dueDate}
                onChange={(event) => set('dueDate')(event.target.value)}
                error={errorFor('dueDate')}
              />
            </div>
            <FieldSeparator />
            <FieldSet>
              <FieldLegend>Items</FieldLegend>
              <div
                aria-hidden
                className={`${lineGrid} hidden text-sm font-medium text-muted-foreground sm:grid`}
              >
                <span>Description</span>
                <span>Quantity</span>
                <span>Unit price</span>
                <span>Tax %</span>
                <span>Disc. %</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="flex flex-col gap-6 sm:gap-3">
                {values.lines.map((line, index) => (
                  <fieldset
                    key={line.key}
                    className={`${lineGrid} flex flex-col gap-3`}
                  >
                    {/* A heading where lines stack; the header row replaces it on wider
                        screens. */}
                    <legend className="mb-3 text-sm font-semibold sm:sr-only">
                      Line {index + 1}
                    </legend>
                    <LineField
                      id={`${formId}-line-${line.key}-description`}
                      label="Description"
                      value={line.description}
                      onChange={(value) =>
                        setLine(line.key, 'description', value)
                      }
                      error={errorFor(`lines.${index}.description`)}
                    />
                    <LineField
                      id={`${formId}-line-${line.key}-quantity`}
                      label="Quantity"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(value) => setLine(line.key, 'quantity', value)}
                      error={errorFor(`lines.${index}.quantity`)}
                    />
                    <LineField
                      id={`${formId}-line-${line.key}-unit-price`}
                      label="Unit price"
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(value) =>
                        setLine(line.key, 'unitPrice', value)
                      }
                      error={errorFor(`lines.${index}.unitPrice`)}
                    />
                    <LineField
                      id={`${formId}-line-${line.key}-tax-rate`}
                      label="Tax %"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.taxRate}
                      onChange={(value) => setLine(line.key, 'taxRate', value)}
                      error={errorFor(`lines.${index}.taxRate`)}
                    />
                    <LineField
                      id={`${formId}-line-${line.key}-discount-rate`}
                      label="Discount %"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.discountRate}
                      onChange={(value) =>
                        setLine(line.key, 'discountRate', value)
                      }
                      error={errorFor(`lines.${index}.discountRate`)}
                    />
                    <p className="flex justify-between font-figures text-sm tabular-nums sm:block sm:h-9 sm:content-center sm:text-right">
                      <span className="text-muted-foreground sm:sr-only">
                        Amount
                      </span>{' '}
                      <output>
                        {totals ? money(totals.lines[index].net) : '—'}
                      </output>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-end sm:self-auto"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={values.lines.length === 1}
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 />
                    </Button>
                  </fieldset>
                ))}
              </div>
              <FieldError>{errorFor('lines')}</FieldError>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={values.lines.length >= MAX_LINES}
                onClick={addLine}
              >
                <Plus data-icon="inline-start" />
                Add line
              </Button>
            </FieldSet>
            <InvoiceTotalsList totals={totals} currency={values.currency} />
            <FieldSeparator />
            <TextareaField
              name="notes"
              label="Notes"
              value={values.notes}
              onChange={(event) => set('notes')(event.target.value)}
              error={errorFor('notes')}
              description="Printed on the invoice, e.g. a thank-you or project reference."
              rows={3}
            />
            <TextareaField
              name="terms"
              label="Terms"
              value={values.terms}
              onChange={(event) => set('terms')(event.target.value)}
              error={errorFor('terms')}
              description="Printed on the invoice, e.g. payment details or late fees."
              rows={3}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save draft
          </Button>
          <MarkSent disabled={pending} onSend={onSend} />
          <Button variant="outline" asChild>
            <Link href="/invoices">Cancel</Link>
          </Button>
          {state.status === 'error' && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          {id && <DeleteDraft id={id} />}
        </CardFooter>
      </form>
    </Card>
  )
}

type LineFieldProps = Omit<React.ComponentProps<typeof Input>, 'onChange'> & {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

// A line's input. Its label shows on small screens, where lines stack; wider
// screens show the column header instead.
function LineField({
  id,
  label,
  onChange,
  error,
  ...inputProps
}: LineFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined} className="gap-1.5">
      <FieldLabel htmlFor={id} className="sm:sr-only">
        {label}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function MarkSent({
  disabled,
  onSend,
}: {
  disabled: boolean
  onSend: () => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function onConfirm(event: React.MouseEvent) {
    // Keep the dialog open until the invoice is sent.
    event.preventDefault()
    startTransition(async () => {
      // On failure, close it so the errors on the form show.
      if (!(await onSend())) setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          Mark as sent
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this invoice as sent?</AlertDialogTitle>
          <AlertDialogDescription>
            It gets the next invoice number and can’t be edited afterwards.
            Invoicely doesn’t email invoices yet, so send it to your client
            yourself.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending && <Loader2 className="animate-spin" />}
            Mark as sent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteDraft({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="ml-auto"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <DeleteDraftDialog
        id={id}
        open={open}
        onOpenChange={setOpen}
        onDeleted={() => router.push('/invoices')}
      />
    </>
  )
}
