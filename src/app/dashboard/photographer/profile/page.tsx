import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your profile</h1>
          <p className="text-muted-foreground mt-1">
            This is what clients will see when they view your listing.
          </p>
        </div>
        <ProfileForm profile={photographerProfile} />
      </main>
    </div>
  )
}
