import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, business and preferences.
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <SettingsNav />
        <div className="flex max-w-2xl min-w-0 flex-1 flex-col gap-6">
          {children}
        </div>
      </div>
    </>
  )
}
