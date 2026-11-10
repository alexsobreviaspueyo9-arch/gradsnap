import {
  Image as ImageIcon,
  CalendarDays,
  ClipboardList,
  UserCircle,
  Images,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { ActionTile } from '@/components/dashboard/action-tile'
import { StatTile } from '@/components/dashboard/stat-tile'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'
import { DASHBOARD_BASE } from '@/lib/routing'

export type PhotographerOverviewProps = {
  displayName: string
  email: string | null
  profileName: string | null
  city: string | null
  basePrice: number | null
  hasSignedContract: boolean
  photoCount: number
  availableSlotCount: number
  totalBookingCount: number
  /** Where in-app links point; the admin preview passes its own. */
  basePath?: string
}

const NAV_TILES = [
  {
    path: '/profile',
    icon: UserCircle,
    title: 'Edit profile',
    description: 'Update your display name, bio, city and base price.',
  },
  {
    path: '/portfolio',
    icon: Images,
    title: 'Manage portfolio',
    description: 'Upload and organize the photos clients will see.',
  },
  {
    path: '/availability',
    icon: CalendarClock,
    title: 'Manage availability',
    description: 'Add open time slots for clients to book.',
  },
  {
    path: '/bookings',
    icon: ClipboardList,
    title: 'Bookings',
    description: 'Confirm or cancel pending booking requests.',
  },
] as const

export function PhotographerOverview({
  displayName,
  email,
  profileName,
  city,
  basePrice,
  hasSignedContract,
  photoCount,
  availableSlotCount,
  totalBookingCount,
  basePath = DASHBOARD_BASE.photographer,
}: PhotographerOverviewProps) {
  const profileRows = [
    { label: 'Email', value: email ?? 'Not set' },
    { label: 'Display name', value: profileName ?? 'Not set' },
    { label: 'City', value: city ?? 'Not set' },
    { label: 'Base price', value: basePrice ? `$${basePrice}` : 'Not set' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <WelcomeBanner
          className="lg:col-span-2"
          name={displayName}
          subtitle="Keep your calendar open and your portfolio fresh to get booked."
          cta={{
            href: `${basePath}/bookings`,
            label: 'View bookings',
          }}
        />
        <section className="flex flex-col justify-between gap-6 rounded-3xl bg-card p-7">
          <h2 className="text-xl font-semibold tracking-tight">
            Your profile
          </h2>
          <dl className="space-y-3 text-sm">
            {profileRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="truncate text-right font-medium">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Contract</dt>
              <dd className="font-medium">
                {hasSignedContract ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-4" /> Signed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <XCircle className="size-4" /> Not signed
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Portfolio photos"
          value={String(photoCount)}
          icon={ImageIcon}
        />
        <StatTile
          label="Available slots"
          value={String(availableSlotCount)}
          icon={CalendarDays}
        />
        <StatTile
          label="Total bookings"
          value={String(totalBookingCount)}
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {NAV_TILES.map(({ path, ...tile }) => (
          <ActionTile key={path} href={`${basePath}${path}`} {...tile} />
        ))}
      </div>
    </div>
  )
}
