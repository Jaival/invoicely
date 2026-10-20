'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

const subscribe = () => () => {}

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  // The stored theme is only known in the browser; render no selection on
  // the server so hydration matches.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Theme"
      value={mounted ? theme : undefined}
      // Radix sends "" when the active item is clicked again; keep the choice.
      onValueChange={(value) => value && setTheme(value)}
    >
      {themes.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value} className="px-4">
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
