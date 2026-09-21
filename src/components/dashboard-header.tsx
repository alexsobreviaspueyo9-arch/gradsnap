import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/brand/wordmark'
import {
  DashboardNav,
  type NavItem,
} from '@/components/dashboard/dashboard-nav'
import { signOut } from '@/lib/actions/auth'

const NAV_BY_ROLE: Record<'photographer' | 'client', readonly NavItem[]> = {
  client: [
    { href: '/dashboard/client', label: 'Overview', exact: true },
    { href: '/dashboard/client/photographers', label: 'Find a photographer' },
  ],
  photographer: [
    { href: '/dashboard/photographer', label: 'Overview', exact: true },
    { href: '/dashboard/photographer/bookings', label: 'Bookings' },
    { href: '/dashboard/photographer/availability', label: 'Availability' },
    { href: '/dashboard/photographer/portfolio', label: 'Portfolio' },
    { href: '/dashboard/photographer/profile', label: 'Profile' },
  ],
}

export function DashboardHeader({
  role,
}: {
  role: 'photographer' | 'client'
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark href={`/dashboard/${role}`} />
            <Badge variant="secondary">
              {role === 'photographer' ? 'Photographer' : 'Client'}
            </Badge>
          </div>
          <form action={signOut}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="h-9 px-4"
            >
              Sign out
            </Button>
          </form>
        </div>
        <DashboardNav items={NAV_BY_ROLE[role]} />
      </div>
    </header>
  )
}
