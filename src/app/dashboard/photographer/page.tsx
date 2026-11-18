import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { countBySource, personalLink } from '@/lib/ref-code'
import { SITE_URL } from '@/lib/site'
import { PHOTOGRAPHER_TERMS_PATH, needsTermsAcceptance } from '@/lib/photographer-terms'
import { todayISODate } from '@/lib/date'
import { PhotographerOverview } from '@/components/dashboard/photographer-overview'

export default async function PhotographerDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch photographer profile
  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Redirect to contract if not signed yet
  if (photographerProfile && needsTermsAcceptance(photographerProfile)) {
    redirect(PHOTOGRAPHER_TERMS_PATH)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { count: photoCount } = photographerProfile
    ? await supabase
        .from('portfolio_photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id)
    : { count: 0 }

  const { count: availableSlotCount } = photographerProfile
    ? await supabase
        .from('availability_slots')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id)
        .eq('is_booked', false)
        .gte('date', todayISODate())
    : { count: 0 }

  let totalBookingCount = 0
  let sourceCounts = countBySource([])
  if (photographerProfile) {
    const { data: slotIdRows } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('photographer_id', photographerProfile.id)

    const slotIds = (slotIdRows ?? []).map((s) => s.id)

    if (slotIds.length > 0) {
      const { data: bookingRows } = await supabase
        .from('bookings')
        .select('source')
        .in('slot_id', slotIds)
      totalBookingCount = bookingRows?.length ?? 0
      sourceCounts = countBySource(bookingRows ?? [])
    }
  }

  const displayName =
    photographerProfile?.display_name ??
    profile?.full_name ??
    user.email ??
    'Photographer'

  return (
    <PhotographerOverview
      displayName={displayName}
      email={user.email ?? null}
      profileName={photographerProfile?.display_name ?? null}
      city={photographerProfile?.city ?? null}
      basePrice={photographerProfile?.base_price ?? null}
      hasSignedContract={photographerProfile?.has_signed_contract ?? false}
      photoCount={photoCount ?? 0}
      availableSlotCount={availableSlotCount ?? 0}
      totalBookingCount={totalBookingCount}
      personalLink={
        photographerProfile
          ? {
              link: personalLink(SITE_URL, photographerProfile.id, photographerProfile.ref_code),
              counts: sourceCounts,
            }
          : null
      }
    />
  )
}
