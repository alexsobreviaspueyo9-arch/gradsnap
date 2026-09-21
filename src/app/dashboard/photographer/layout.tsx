import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell role="photographer">{children}</DashboardShell>
}
