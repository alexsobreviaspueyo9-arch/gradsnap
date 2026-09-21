import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { AvailabilityManager } from '@/components/photographer/AvailabilityManager'

export default async function PhotographerAvailabilityPage() {
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

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('photographer_id', photographerProfile.id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  return (
    <>
      <PageHeader
        title="Your availability"
        description="Add open time slots for clients to book."
      />
      <AvailabilityManager
        photographerId={photographerProfile.id}
        initialSlots={slots ?? []}
      />
    </>
  )
}
