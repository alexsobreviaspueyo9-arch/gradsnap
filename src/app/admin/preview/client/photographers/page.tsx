import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { CalendarSearch } from '@/components/client/CalendarSearch'
import { searchSlots } from '@/app/admin/preview/preview-data'

export default async function SearchPreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader
        title="Find a photographer"
        description="Pick a date to see which photographers are available."
      />
      <CalendarSearch initialSlots={searchSlots} paymentsEnabled={false} />
    </>
  )
}
