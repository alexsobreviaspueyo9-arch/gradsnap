import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarX2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { loadPublicListing, loadViewerRole } from '@/lib/public-photographers'
import { PUBLIC_PHOTOGRAPHERS_PATH } from '@/lib/guest-booking'
import { PublicShell } from '@/components/brand/public-shell'
import { PageHeader } from '@/components/dashboard/page-header'
import { CalendarSearch } from '@/components/client/CalendarSearch'

export const metadata: Metadata = {
  title: 'Graduation photographers in Virginia | GradSnap',
  description:
    'See which graduation photographers are free on your date, compare prices and styles, and book in minutes.',
  alternates: { canonical: PUBLIC_PHOTOGRAPHERS_PATH },
  robots: { index: true, follow: true },
}

export default async function PublicPhotographersPage() {
  const supabase = await createClient()
  const role = await loadViewerRole(supabase)
  // Signed-in clients get the full experience (live slots, booking, chat).
  if (role === 'client') redirect('/dashboard/client/photographers')

  const slots = await loadPublicListing(supabase)

  return (
    <PublicShell accountHref={role === 'photographer' ? '/dashboard/photographer' : undefined}>
      <PageHeader
        title="Find a photographer"
        description="Pick a date to see which photographers are available. You only need an account to book."
      />
      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarX2 className="size-7" strokeWidth={1.75} />
          </span>
          <p className="text-xl font-semibold">No open slots yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Photographers have not opened any dates. Check back soon.
          </p>
        </div>
      ) : (
        <CalendarSearch
          initialSlots={slots}
          paymentsEnabled={false}
          viewer={role === 'photographer' ? 'photographer' : 'guest'}
          photographersPath={PUBLIC_PHOTOGRAPHERS_PATH}
        />
      )}
    </PublicShell>
  )
}
