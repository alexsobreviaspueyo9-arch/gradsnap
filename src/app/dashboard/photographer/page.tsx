import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { countBySource, personalLink } from '@/lib/ref-code'
import { SITE_URL } from '@/lib/site'
import { PHOTOGRAPHER_TERMS_PATH, needsTermsAcceptance } from '@/lib/photographer-terms'
import { todayISODate } from '@/lib/date'
import { PhotographerOverview } from '@/components/dashboard/photographer-overview'
import { OnboardingChecklist, TodayPanel } from '@/components/dashboard/photographer-today'
import { CalendarFeedCard } from '@/components/dashboard/calendar-feed-card'
import { loadTodayData } from '@/lib/photographer-today'
import { profileChecklist } from '@/lib/photographer-dashboard'
import { DASHBOARD_BASE } from '@/lib/routing'

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

  let top: React.ReactNode = null
  if (photographerProfile) {
    const [today, { count: packageCount }, { data: feed }] = await Promise.all([
      loadTodayData(supabase, photographerProfile.id, user.id),
      supabase
        .from('photographer_packages')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographerProfile.id),
      supabase
        .from('photographer_calendar_feeds')
        .select('token')
        .eq('photographer_id', photographerProfile.id)
        .maybeSingle(),
    ])
    const checklist = profileChecklist({
      displayName: photographerProfile.display_name,
      bio: photographerProfile.bio,
      city: photographerProfile.city,
      basePrice: photographerProfile.base_price,
      packageCount: packageCount ?? 0,
      specialty: photographerProfile.specialty,
      photoCount: photoCount ?? 0,
      openSlotCount: availableSlotCount ?? 0,
      hasWeeklyAvailability: Object.keys(photographerProfile.weekly_availability ?? {}).length > 0,
      paymentMethod: photographerProfile.payment_method,
    })
    top = (
      <>
        <TodayPanel data={today} basePath={DASHBOARD_BASE.photographer} />
        <OnboardingChecklist {...checklist} basePath={DASHBOARD_BASE.photographer} />
        <CalendarFeedCard initialToken={feed?.token ?? null} siteUrl={SITE_URL} />
      </>
    )
  }

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
      top={top}
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
