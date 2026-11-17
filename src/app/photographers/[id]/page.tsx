import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadPublicPhotographer, loadViewerRole } from '@/lib/public-photographers'
import {
  PUBLIC_PHOTOGRAPHERS_PATH,
  isUuid,
  parseSlotSelection,
  selectionQuery,
} from '@/lib/guest-booking'
import { PublicShell } from '@/components/brand/public-shell'
import { PhotographerDetailView } from '@/components/client/photographer-detail-view'

const META_DESCRIPTION_LENGTH = 155

// generateMetadata and the page share one fetch per request.
const loadProfile = cache(async (id: string) => {
  if (!isUuid(id)) return null
  return loadPublicPhotographer(await createClient(), id)
})

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string; slot?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const profile = await loadProfile(id)
  if (!profile) return { robots: { index: false, follow: false } }
  const { photographer } = profile
  const name = photographer.display_name ?? 'Photographer'
  const where = photographer.city ? ` in ${photographer.city}` : ''
  return {
    title: `${name}, graduation photographer${where} | GradSnap`,
    description: (photographer.bio ?? `Book a graduation session with ${name}${where}.`).slice(
      0,
      META_DESCRIPTION_LENGTH
    ),
    alternates: { canonical: `${PUBLIC_PHOTOGRAPHERS_PATH}/${id}` },
    robots: { index: true, follow: true },
  }
}

export default async function PublicPhotographerPage({ params, searchParams }: Props) {
  const { id } = await params
  const selection = parseSlotSelection(await searchParams)
  const supabase = await createClient()
  const role = await loadViewerRole(supabase)
  // A guest who just signed up lands here; the dashboard page does the booking.
  if (role === 'client' && isUuid(id)) {
    redirect(`/dashboard/client/photographers/${id}${selectionQuery(selection)}`)
  }

  const profile = await loadProfile(id)
  if (!profile) notFound()

  return (
    <PublicShell accountHref={role === 'photographer' ? '/dashboard/photographer' : undefined}>
      <PhotographerDetailView
        photographer={profile.photographer}
        photos={profile.photos}
        slots={profile.slots}
        justBooked={false}
        paymentsEnabled={false}
        basePath=""
        viewer={role === 'photographer' ? 'photographer' : 'guest'}
        initialDate={selection.date}
        initialSlotId={selection.slotId}
      />
    </PublicShell>
  )
}
