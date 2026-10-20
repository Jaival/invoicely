import { LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react'

export type NavItem = { title: string; href: string; icon: LucideIcon }

export const mainNav: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clients', href: '/clients', icon: Users },
]

export const secondaryNav: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
]

// Labels for each path segment, used by the header breadcrumb.
const segmentTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  settings: 'Settings',
  profile: 'Profile',
  business: 'Business',
  appearance: 'Appearance',
}

// Under a collection, "new" and record ids take their label from it.
const childTitles: Record<string, { new: string; record: string }> = {
  clients: { new: 'New client', record: 'Client' },
}

export function segmentTitle(segments: string[], index: number) {
  const segment = segments[index]
  const child = index > 0 ? childTitles[segments[index - 1]] : undefined
  if (child) return segment === 'new' ? child.new : child.record
  return segmentTitles[segment] ?? segment
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
