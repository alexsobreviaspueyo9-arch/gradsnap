import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell role="client">{children}</DashboardShell>
}
