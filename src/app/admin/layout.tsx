import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AdminHeader } from '@/components/admin/admin-header'

export const metadata: Metadata = {
  title: 'GradSnap admin',
  robots: { index: false, follow: false },
}

// Every /admin page also calls requireAdmin() itself: a layout alone doesn't
// re-run on every client-side navigation.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <DashboardShell header={<AdminHeader />}>{children}</DashboardShell>
}
