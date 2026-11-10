import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { AvailabilityManager } from '@/components/photographer/AvailabilityManager'
import { PREVIEW_PHOTOGRAPHER_ID, slots } from '@/app/admin/preview/preview-data'

export default async function AvailabilityPreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Your availability" description="Add open time slots for clients to book." />
      <AvailabilityManager photographerId={PREVIEW_PHOTOGRAPHER_ID} initialSlots={slots} />
    </>
  )
}
