import { CalendarDays, ClipboardList } from 'lucide-react'
import { StatTile } from '@/components/dashboard/stat-tile'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'

export type ClientOverviewProps = {
  displayName: string
  email: string | null
  fullName: string | null
  upcomingCount: number
  pastCount: number
}

export function ClientOverview({
  displayName,
  email,
  fullName,
  upcomingCount,
  pastCount,
}: ClientOverviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WelcomeBanner
        className="lg:col-span-2"
        name={displayName}
        subtitle="Browse photographers, pick an open slot and lock in your session."
        cta={{
          href: '/dashboard/client/photographers',
          label: 'Find a photographer',
        }}
      />

      <section className="flex flex-col justify-between gap-8 rounded-3xl bg-card p-7 lg:row-span-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Your account
        </h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 font-medium break-all">{email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-0.5 font-medium">{fullName ?? 'Not set'}</dd>
          </div>
        </dl>
      </section>

      <StatTile
        label="Upcoming sessions"
        value={String(upcomingCount)}
        icon={CalendarDays}
      />
      <StatTile
        label="Past bookings"
        value={String(pastCount)}
        icon={ClipboardList}
      />
    </div>
  )
}
