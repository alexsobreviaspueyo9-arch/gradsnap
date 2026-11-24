import Link from 'next/link'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { StatTile } from '@/components/dashboard/stat-tile'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import { DASHBOARD_BASE } from '@/lib/routing'

export type ClientOverviewProps = {
  displayName: string
  email: string | null
  fullName: string | null
  upcomingCount: number
  pastCount: number
  /** Where in-app links point; the admin preview passes its own. */
  basePath?: string
  saved?: { id: string; name: string }[]
}

export function ClientOverview({
  displayName,
  email,
  fullName,
  upcomingCount,
  pastCount,
  basePath = DASHBOARD_BASE.client,
  saved = [],
}: ClientOverviewProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <WelcomeBanner
        className="lg:col-span-2"
        name={displayName}
        subtitle="Browse photographers, pick an open slot and lock in your session."
        cta={{
          href: `${basePath}/photographers`,
          label: 'Find a photographer',
        }}
      />

      <section className="flex flex-col justify-between gap-8 rounded-2xl border border-border bg-card p-7 gs-elev-1 lg:row-span-2">
        <h2 className="text-xl font-medium">
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
      <section aria-labelledby="saved-heading" className="rounded-2xl border border-border bg-card p-7 gs-elev-1 lg:col-span-3">
        <h2 id="saved-heading" className="text-xl font-medium">
          Saved photographers
        </h2>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Tap Save on a photographer&apos;s profile to keep them here.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {saved.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${basePath}/photographers/${p.id}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 text-sm font-medium hover:bg-secondary"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
