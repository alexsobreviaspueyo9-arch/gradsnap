import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { PortfolioManager } from '@/components/photographer/PortfolioManager'
import { PREVIEW_PHOTOGRAPHER_ID, photos } from '@/app/admin/preview/preview-data'

export default async function PortfolioPreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader title="Your portfolio" description="Upload photos to show clients your work." />
      <PortfolioManager photographerId={PREVIEW_PHOTOGRAPHER_ID} initialPhotos={photos} />
    </>
  )
}
