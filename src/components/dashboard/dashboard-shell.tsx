import { DashboardHeader } from '@/components/dashboard-header'

export function DashboardShell({
  role,
  children,
}: {
  role: 'photographer' | 'client'
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <DashboardHeader role={role} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  )
}
