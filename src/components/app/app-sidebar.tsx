'use client'

import {
  isActivePath,
  mainNav,
  secondaryNav,
  type NavItem,
} from '@/components/app/nav'
import { NavUser, type NavUserProps } from '@/components/app/nav-user'
import { Logo } from '@/components/logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type AppSidebarProps = {
  organizationName: string
  user: NavUserProps['user']
}

export function AppSidebar({ organizationName, user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                {/* Wrapped so the menu button's icon sizing doesn't shrink it. */}
                <div className="flex size-8 shrink-0">
                  <Logo className="size-8" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Invoicely</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {organizationName}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={mainNav} />
        <NavGroup items={secondaryNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavGroup({
  items,
  className,
}: {
  items: NavItem[]
  className?: string
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup className={className}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActivePath(pathname, item.href)}
                tooltip={item.title}
              >
                <Link
                  href={item.href}
                  // On mobile the sidebar is a sheet; close it after navigating.
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
