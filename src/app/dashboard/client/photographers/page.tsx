import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUpcomingSlot, todayISODate, todayInAppZone } from '@/lib/date'
import { parseGradParam } from '@/lib/grad-date'
import { loadCardStats } from '@/lib/public-photographers'
import { PageHeader } from '@/components/dashboard/page-header'
import {
  CalendarSearch,
  type SlotWithPhotographer,
} from '@/components/client/CalendarSearch'

export default async function ClientPhotographersPage({
  searchParams,
}: {
  searchParams: Promise<{ grad?: string }>
}) {
  const grad = parseGradParam((await searchParams).grad, todayInAppZone())
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Frees slots held by requests older than 48h, then keeps every
  // photographer's weekly hours filled 12 weeks ahead.
  await supabase.rpc('expire_stale_bookings')
  await supabase.rpc('refresh_weekly_slots')

  const { data: photographers } = await supabase
    .from('photographer_profiles')
    .select(
      'id, display_name, city, base_price, price_max, specialty, specialty_other, payment_method, requires_deposit, payment_terms, payment_link'
    )
    .eq('has_signed_contract', true)
    .eq('status', 'claimed')

  const photographerIds = (photographers ?? []).map((p) => p.id)

  const { data: slots } =
    photographerIds.length > 0
      ? await supabase
          .from('availability_slots')
          .select('*')
          .in('photographer_id', photographerIds)
          .eq('is_booked', false)
          .gte('date', todayISODate())
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
      : { data: [] }

  const photographerById = new Map((photographers ?? []).map((p) => [p.id, p]))

  const slotsWithPhotographer: SlotWithPhotographer[] = (slots ?? [])
    .filter((slot) => isUpcomingSlot(slot))
    .map((slot) => {
      const photographer = photographerById.get(slot.photographer_id)
      return photographer ? { ...slot, photographer } : null
    })
    .filter((s): s is SlotWithPhotographer => s !== null)

  return (
    <>
      <PageHeader
        title="Find a photographer"
        description="Pick a date to see which photographers are available."
      />

      <CalendarSearch
        initialSlots={slotsWithPhotographer}
        paymentsEnabled={process.env.PAYMENTS_ENABLED === 'true'}
        cardStats={await loadCardStats(supabase)}
        gradDate={grad}
      />
    </>
  )
}
