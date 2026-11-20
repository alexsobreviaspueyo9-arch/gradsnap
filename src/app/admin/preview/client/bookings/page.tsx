import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { ClientBookingsList } from '@/components/client/client-bookings-list'
import { clientBookings } from '@/app/admin/preview/preview-data'

export default async function ClientBookingsPreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader
        title="Your bookings"
        description="Where each session stands, from request to delivered photos."
      />
      <ClientBookingsList bookings={clientBookings} calendarHref={null} />
    </>
  )
}
