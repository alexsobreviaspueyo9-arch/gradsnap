import { requireAdmin } from '@/lib/admin'
import { PREVIEW_BASE } from '@/lib/routing'
import { ClientOverview } from '@/components/dashboard/client-overview'

export default async function ClientOverviewPreview() {
  await requireAdmin()
  return (
    <ClientOverview
      displayName="Ava"
      email="ava@example.com"
      fullName="Ava Thompson"
      upcomingCount={1}
      pastCount={0}
      basePath={PREVIEW_BASE.client}
    />
  )
}
