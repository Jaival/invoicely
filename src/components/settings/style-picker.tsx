'use client'

import { saveAppearance } from '@/app/(app)/settings/appearance/actions'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Appearance, Palette, Style } from '@/lib/appearance'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

const styleOptions: { value: Style; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'brutal', label: 'Brutal' },
]

// Swatches match the palettes in globals.css: action, then highlight.
const paletteOptions: { value: Palette; label: string; swatches: string[] }[] =
  [
    { value: 'emerald', label: 'Emerald', swatches: ['#10b981', '#6ee7b7'] },
    { value: 'sunshine', label: 'Sunshine', swatches: ['#ffd23f', '#ff7ab6'] },
  ]

export function StylePicker({ saved }: { saved: Appearance }) {
  // Shows the choice right away; the page restyles once it's saved.
  const [appearance, setAppearance] = useState(saved)
  const [pending, startTransition] = useTransition()

  function choose(next: Partial<Appearance>) {
    const previous = appearance
    const updated = { ...appearance, ...next }
    setAppearance(updated)
    startTransition(async () => {
      const { error } = await saveAppearance(updated)
      if (error) {
        setAppearance(previous)
        toast.error(error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      <Field>
        <FieldLabel id="style-label">Style</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby="style-label"
          value={appearance.style}
          // Radix sends "" when the active item is clicked again; keep it.
          onValueChange={(value) => value && choose({ style: value as Style })}
        >
          {styleOptions.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className="px-4">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>
          Brutal has thick borders, hard shadows and bold colors. It is light
          only for now.
        </FieldDescription>
      </Field>
      <Field data-disabled={appearance.style === 'clean'}>
        <FieldLabel id="palette-label">Palette</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-labelledby="palette-label"
          value={appearance.palette}
          disabled={appearance.style === 'clean'}
          onValueChange={(value) =>
            value && choose({ palette: value as Palette })
          }
        >
          {paletteOptions.map(({ value, label, swatches }) => (
            <ToggleGroupItem key={value} value={value} className="px-4">
              <span className="flex" aria-hidden>
                {swatches.map((color) => (
                  <span
                    key={color}
                    className="size-3 border border-foreground"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldDescription>Colors for the Brutal style.</FieldDescription>
      </Field>
    </div>
  )
}
