import { ThemePicker } from '@/components/settings/theme-picker'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Appearance' }

export default function AppearanceSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose a theme, or follow your device setting. Saved in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ThemePicker />
      </CardContent>
    </Card>
  )
}
