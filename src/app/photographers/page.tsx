import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadCardStats, loadPublicListing, loadViewerRole } from '@/lib/public-photographers'
import { PUBLIC_PHOTOGRAPHERS_PATH } from '@/lib/guest-booking'
import { GRAD_PARAM, parseGradParam } from '@/lib/grad-date'
import { todayInAppZone } from '@/lib/date'
import { PublicShell } from '@/components/brand/public-shell'
import { PilotNote } from '@/components/brand/pilot-note'
import { PageHeader } from '@/components/dashboard/page-header'
import { CalendarSearch } from '@/components/client/CalendarSearch'

export const metadata: Metadata = {
  title: 'Graduation photographers in Virginia | GradSnap',
  description:
    'See which graduation photographers are free on your date, compare prices and styles, and book in minutes.',
  alternates: { canonical: PUBLIC_PHOTOGRAPHERS_PATH },
  robots: { index: true, follow: true },
}

export default async function PublicPhotographersPage({
  searchParams,
}: {
  searchParams: Promise<{ grad?: string }>
}) {
  // ?grad= from the landing page: marks the day, the calendar opens on today.
  const grad = parseGradParam((await searchParams).grad, todayInAppZone())
  const supabase = await createClient()
  const role = await loadViewerRole(supabase)
  // Signed-in clients get the full experience (live slots, booking, chat).
  if (role === 'client') redirect(`/dashboard/client/photographers${grad ? `?${GRAD_PARAM}=${grad}` : ''}`)

  const [slots, cardStats] = await Promise.all([loadPublicListing(supabase), loadCardStats(supabase)])

  return (
    <PublicShell accountHref={role === 'photographer' ? '/dashboard/photographer' : undefined}>
      <PageHeader
        title="Find a photographer"
        description="Pick a date to see which photographers are available. You only need an account to book."
      />
      {process.env.PAYMENTS_ENABLED !== 'true' && <PilotNote className="mb-6" />}
      <CalendarSearch
        initialSlots={slots}
        paymentsEnabled={false}
        viewer={role === 'photographer' ? 'photographer' : 'guest'}
        photographersPath={PUBLIC_PHOTOGRAPHERS_PATH}
        cardStats={cardStats}
        gradDate={grad}
      />
    </PublicShell>
  )
}
