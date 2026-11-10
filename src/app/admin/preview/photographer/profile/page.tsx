import { requireAdmin } from '@/lib/admin'
import { PageHeader } from '@/components/dashboard/page-header'
import { ProfileForm } from '@/components/photographer/ProfileForm'
import { photographer } from '@/app/admin/preview/preview-data'

export default async function ProfilePreview() {
  await requireAdmin()
  return (
    <>
      <PageHeader
        title="Your profile"
        description="This is what clients will see when they view your listing."
      />
      <ProfileForm profile={photographer} />
    </>
  )
}
