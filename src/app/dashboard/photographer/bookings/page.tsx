import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { BookingsManager } from '@/components/photographer/BookingsManager'
import type { BookingWithDetails } from '@/components/photographer/BookingsManager'

export default async function PhotographerBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!photographerProfile) redirect('/dashboard/photographer')

  if (!photographerProfile.has_signed_contract) {
    redirect('/onboarding/photographer/contract')
  }

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('id, date, start_time, end_time')
    .eq('photographer_id', photographerProfile.id)

  const slotIds = (slots ?? []).map((s) => s.id)

  let bookings: BookingWithDetails[] = []

  if (slotIds.length > 0) {
    const { data: bookingRows } = await supabase
      .from('bookings')
      .select('*')
      .in('slot_id', slotIds)

    const clientIds = [...new Set((bookingRows ?? []).map((b) => b.client_id))]

    const { data: clients } =
      clientIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', clientIds)
        : { data: [] }

    const slotsById = new Map((slots ?? []).map((s) => [s.id, s]))
    const clientsById = new Map((clients ?? []).map((c) => [c.id, c]))

    bookings = (bookingRows ?? [])
      .map((booking) => {
        const slot = slotsById.get(booking.slot_id)
        const client = clientsById.get(booking.client_id)
        if (!slot) return null
        return {
          ...booking,
          slot,
          clientName: client?.full_name ?? 'Client',
        }
      })
      .filter((b): b is BookingWithDetails => b !== null)
      .sort((a, b) =>
        a.slot.date === b.slot.date
          ? a.slot.start_time.localeCompare(b.slot.start_time)
          : a.slot.date.localeCompare(b.slot.date)
      )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Bookings"
        description="Confirm or cancel pending booking requests."
      />
      <BookingsManager initialBookings={bookings} />
    </div>
  )
}
