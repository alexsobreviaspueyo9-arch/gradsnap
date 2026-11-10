import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { BookingsManager } from '@/components/photographer/BookingsManager'
import { bookings } from '@/app/admin/preview/preview-data'

export default async function BookingsPreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Bookings" description="Confirm or cancel pending booking requests." />
      <BookingsManager initialBookings={bookings} />
    </>
  )
}
