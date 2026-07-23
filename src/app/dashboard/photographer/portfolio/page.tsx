import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortfolioManager } from '@/components/photographer/PortfolioManager'

export default async function PhotographerPortfolioPage() {
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

  const { data: photos } = await supabase
    .from('portfolio_photos')
    .select('*')
    .eq('photographer_id', photographerProfile.id)
    .order('sort_order', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your portfolio</h1>
          <p className="text-muted-foreground mt-1">
            Upload photos to show clients your work.
          </p>
        </div>
        <PortfolioManager
          photographerId={photographerProfile.id}
          initialPhotos={photos ?? []}
        />
      </main>
    </div>
  )
}
