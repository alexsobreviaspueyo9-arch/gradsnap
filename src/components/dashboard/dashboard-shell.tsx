import { DashboardHeader } from '@/components/dashboard-header'

// Pass `role` for a dashboard, or a custom `header` (the admin area).
export function DashboardShell({
  children,
  ...props
}: (
  | { role: 'photographer' | 'client'; header?: never }
  | { header: React.ReactNode; role?: never }
) & {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      {props.role ? <DashboardHeader role={props.role} /> : props.header}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  )
}
