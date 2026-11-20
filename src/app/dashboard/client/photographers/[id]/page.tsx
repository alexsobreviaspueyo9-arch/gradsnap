import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUpcomingSlot, todayISODate } from '@/lib/date'
import { PhotographerDetailView } from '@/components/client/photographer-detail-view'
import { parseSlotSelection } from '@/lib/guest-booking'
import { loadProfileExtras } from '@/lib/public-photographers'

export default async function PhotographerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ booked?: string; date?: string; slot?: string; pkg?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const { booked } = query
  // Set when a guest picked a time before signing up; they still press Book.
  const selection = parseSlotSelection(query)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('id', id)
    .eq('status', 'claimed')
    .single()

  if (!photographer) redirect('/dashboard/client/photographers')

  await supabase.rpc('refresh_weekly_slots')

  const { data: photos } = await supabase
    .from('portfolio_photos')
    .select('*')
    .eq('photographer_id', id)
    .order('sort_order', { ascending: true })

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('photographer_id', id)
    .eq('is_booked', false)
    .gte('date', todayISODate())
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  const [extras, { data: favorite }] = await Promise.all([
    loadProfileExtras(supabase, id),
    supabase
      .from('favorites')
      .select('photographer_id')
      .eq('user_id', user.id)
      .eq('photographer_id', id)
      .maybeSingle(),
  ])

  return (
    <PhotographerDetailView
      photographer={photographer}
      photos={photos ?? []}
      slots={(slots ?? []).filter((slot) => isUpcomingSlot(slot))}
      justBooked={booked === '1'}
      paymentsEnabled={process.env.PAYMENTS_ENABLED === 'true'}
      initialDate={selection.date}
      initialSlotId={selection.slotId}
      initialPackageId={selection.packageId}
      packages={extras.packages}
      reviews={extras.reviews}
      stats={extras.stats}
      isFavorite={favorite !== null}
    />
  )
}
