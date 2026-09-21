import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { ProfileForm } from '@/components/photographer/ProfileForm'

export default async function PhotographerProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!photographerProfile) redirect('/dashboard/photographer')

  if (!photographerProfile.has_signed_contract) {
    redirect('/onboarding/photographer/contract')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your profile"
        description="This is what clients will see when they view your listing."
      />
      <ProfileForm profile={photographerProfile} />
    </div>
  )
}
