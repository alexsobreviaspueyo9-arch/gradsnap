import { DashboardHeader } from '@/components/dashboard-header'

export function DashboardShell({
  role,
  children,
}: {
  role: 'photographer' | 'client'
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-[100dvh] bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_85%_0%,var(--brand-glow),transparent_75%)]"
      />
      <DashboardHeader role={role} />
      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  )
}
