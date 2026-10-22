import { StylePicker } from '@/components/settings/style-picker'
import { ThemePicker } from '@/components/settings/theme-picker'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { userAppearance } from '@/lib/appearance'
import { requireSession } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Appearance' }

export default async function AppearanceSettingsPage() {
  const { user } = await requireSession()
  const appearance = userAppearance(user)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Style</CardTitle>
          <CardDescription>
            How Invoicely looks. Saved on your account, so it follows you to
            every device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StylePicker saved={appearance} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Choose a theme, or follow your device setting. Saved in this
            browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker />
        </CardContent>
      </Card>
    </>
  )
}
