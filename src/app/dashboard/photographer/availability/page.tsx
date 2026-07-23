import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your availability</h1>
          <p className="text-muted-foreground mt-1">
            Add open time slots for clients to book.
          </p>
        </div>
        <AvailabilityManager
          photographerId={photographerProfile.id}
          initialSlots={slots ?? []}
        />
      </main>
    </div>
  )
}
