import { AppHeader } from '@/components/app/app-header'
import { AppSidebar } from '@/components/app/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getActiveOrganization } from '@/lib/organization'
import { requireSession } from '@/lib/session'
import { cookies } from 'next/headers'

// The signed-in app: sidebar, header, and the page in between.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [{ user, session }, cookieStore] = await Promise.all([
    requireSession(),
    cookies(),
  ])
  const activeOrganization = await getActiveOrganization(
    session.activeOrganizationId,
  )
  // The sidebar stores its collapsed state in this cookie.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        organizationName={activeOrganization?.name ?? 'My business'}
        user={{ name: user.name, email: user.email, image: user.image }}
      />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
