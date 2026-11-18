import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { countBySource, personalLink } from '@/lib/ref-code'
import { SITE_URL } from '@/lib/site'
import { PhotographerOverview } from '@/components/dashboard/photographer-overview'
import { bookings, openSlots, photographer, photos } from '@/app/admin/preview/preview-data'

export default async function PhotographerOverviewPreview() {
  await requireAdmin()
  return (
    <PhotographerOverview
      displayName="Maya"
      email="maya@example.com"
      profileName={photographer.display_name}
      city={photographer.city}
      basePrice={photographer.base_price}
      hasSignedContract
      photoCount={photos.length}
      availableSlotCount={openSlots.length}
      totalBookingCount={bookings.length}
      basePath={PREVIEW_BASE.photographer}
      personalLink={{
        link: personalLink(SITE_URL, photographer.id, photographer.ref_code),
        counts: countBySource(bookings),
      }}
    />
  )
}
