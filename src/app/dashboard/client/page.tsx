import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayISODate } from '@/lib/date'
import { ClientOverview } from '@/components/dashboard/client-overview'

export default async function ClientDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? 'there'

  const { data: myBookings } = await supabase
    .from('bookings')
    .select('id, status, slot_id')
    .eq('client_id', user.id)
    .in('status', ['pending', 'confirmed'])

  const slotIds = [...new Set((myBookings ?? []).map((b) => b.slot_id))]

  const { data: mySlots } =
    slotIds.length > 0
      ? await supabase.from('availability_slots').select('id, date').in('id', slotIds)
      : { data: [] }

  const slotDateById = new Map((mySlots ?? []).map((s) => [s.id, s.date]))
  const today = todayISODate()

  const upcomingCount = (myBookings ?? []).filter((b) => {
    const date = slotDateById.get(b.slot_id)
    return date && date >= today
  }).length

  const pastCount = (myBookings ?? []).filter((b) => {
    const date = slotDateById.get(b.slot_id)
    return date && date < today
  }).length

  return (
    <ClientOverview
      displayName={displayName}
      email={user.email ?? null}
      fullName={profile?.full_name ?? null}
      upcomingCount={upcomingCount}
      pastCount={pastCount}
    />
  )
}
