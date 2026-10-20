import { LayoutDashboard, Settings, type LucideIcon } from 'lucide-react'

export type NavItem = { title: string; href: string; icon: LucideIcon }

export const mainNav: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

export const secondaryNav: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
]

// Labels for each path segment, used by the header breadcrumb.
export const segmentTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  profile: 'Profile',
  appearance: 'Appearance',
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
