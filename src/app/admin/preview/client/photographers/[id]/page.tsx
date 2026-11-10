import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { PhotographerDetailView } from '@/components/client/photographer-detail-view'
import { openSlots, photographer, photos } from '@/app/admin/preview/preview-data'

export default async function PhotographerDetailPreview({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  if ((await params).id !== photographer.id) notFound()
  return (
    <PhotographerDetailView
      photographer={photographer}
      photos={photos}
      slots={openSlots}
      justBooked={false}
      paymentsEnabled={false}
      basePath={PREVIEW_BASE.client}
    />
  )
}
