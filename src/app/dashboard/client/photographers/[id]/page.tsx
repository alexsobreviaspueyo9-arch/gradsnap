import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUpcomingSlot, todayISODate } from '@/lib/date'
import { PhotographerDetailView } from '@/components/client/photographer-detail-view'

export default async function PhotographerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ booked?: string }>
}) {
  const { id } = await params
  const { booked } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographer } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!photographer) redirect('/dashboard/client/photographers')

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

  return (
    <PhotographerDetailView
      photographer={photographer}
      photos={photos ?? []}
      slots={(slots ?? []).filter((slot) => isUpcomingSlot(slot))}
      justBooked={booked === '1'}
      paymentsEnabled={process.env.PAYMENTS_ENABLED === 'true'}
    />
  )
}
