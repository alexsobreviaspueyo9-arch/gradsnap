import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadClientBookings } from '@/lib/client-bookings'
import { PageHeader } from '@/components/dashboard/page-header'
import { ClientBookingsList, FindMoreLink } from '@/components/client/client-bookings-list'

export default async function ClientBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bookings = await loadClientBookings(supabase, user.id)

  return (
    <>
      <PageHeader
        title="Your bookings"
        description="Where each session stands, from request to delivered photos."
        action={<FindMoreLink href="/dashboard/client/photographers" />}
      />
      <ClientBookingsList
        bookings={bookings}
        calendarHref={(id) => `/dashboard/client/bookings/${id}/calendar`}
      />
    </>
  )
}
