import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientBooking } from '@/components/client/client-bookings-list'
import type { Database } from '@/types/database'

const MAX_BOOKINGS = 100

// The signed-in client's bookings (RLS: own rows only), newest session first,
// with the photographer's name and the client's own review if any.
export async function loadClientBookings(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<ClientBooking[]> {
  await supabase.rpc('expire_stale_bookings')
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, slot_id, package_name, delivered_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(MAX_BOOKINGS)
  if (!bookings || bookings.length === 0) return []

  const [{ data: slots }, { data: reviews }] = await Promise.all([
    supabase
      .from('availability_slots')
      .select('id, date, start_time, end_time, photographer_id')
      .in('id', bookings.map((b) => b.slot_id)),
    supabase.from('reviews').select('booking_id, rating').eq('client_id', clientId),
  ])
  const slotById = new Map((slots ?? []).map((s) => [s.id, s]))
  const photographerIds = [...new Set((slots ?? []).map((s) => s.photographer_id))]
  const { data: photographers } =
    photographerIds.length > 0
      ? await supabase.from('photographer_profiles').select('id, display_name').in('id', photographerIds)
      : { data: [] }
  const nameById = new Map((photographers ?? []).map((p) => [p.id, p.display_name]))
  const reviewByBooking = new Map((reviews ?? []).map((r) => [r.booking_id, r]))

  return bookings
    .flatMap((b): ClientBooking[] => {
      const slot = slotById.get(b.slot_id)
      if (!slot) return []
      return [
        {
          id: b.id,
          status: b.status,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          photographerName: nameById.get(slot.photographer_id) ?? 'Your photographer',
          packageName: b.package_name,
          deliveredAt: b.delivered_at,
          review: reviewByBooking.get(b.id) ?? null,
        },
      ]
    })
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
}
