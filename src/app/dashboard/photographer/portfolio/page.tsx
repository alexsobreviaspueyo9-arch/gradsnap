import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
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
    <>
      <PageHeader
        title="Your portfolio"
        description="Upload photos to show clients your work."
      />
      <PortfolioManager
        photographerId={photographerProfile.id}
        initialPhotos={photos ?? []}
      />
    </>
  )
}
