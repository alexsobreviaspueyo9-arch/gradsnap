import { AppHeader } from '@/components/dashboard-header'
import { DashboardNav, type NavItem } from '@/components/dashboard/dashboard-nav'

const ADMIN_NAV: readonly NavItem[] = [
  { href: '/admin/preview', label: 'Preview' },
  { href: '/admin/leads', label: 'Leads' },
]

export function AdminHeader() {
  return (
    <AppHeader homeHref="/admin" badge="Admin">
      <DashboardNav items={ADMIN_NAV} label="Admin" tall />
    </AppHeader>
  )
}
