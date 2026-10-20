import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Option } from '@/lib/locale-data'

// Labelled form controls with a description and validation error.

type TextFieldProps = React.ComponentProps<typeof Input> & {
  name: string
  label: string
  description?: string
  error?: string
}

export function TextField({
  name,
  label,
  description,
  error,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

type SelectFieldProps = {
  name: string
  label: string
  placeholder: string
  options: Option[]
  defaultValue: string
  showCode?: boolean
  error?: string
}

export function SelectField({
  name,
  label,
  placeholder,
  options,
  defaultValue,
  showCode,
  error,
}: SelectFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} defaultValue={defaultValue || undefined}>
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={error ? true : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.code} value={option.code}>
                {showCode ? `${option.code} · ${option.name}` : option.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

type TextareaFieldProps = React.ComponentProps<typeof Textarea> & {
  name: string
  label: string
  description?: string
  error?: string
}

export function TextareaField({
  name,
  label,
  description,
  error,
  ...textareaProps
}: TextareaFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Textarea
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        {...textareaProps}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
