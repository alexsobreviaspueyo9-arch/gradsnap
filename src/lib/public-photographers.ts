import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlotWithPhotographer } from '@/components/client/CalendarSearch'
import type { PublicPhotographer } from '@/components/client/photographer-detail-view'
import type { AvailabilitySlot, Database, PortfolioPhoto } from '@/types/database'
import { EMPTY_CARD_STATS, type CardStats } from '@/lib/photographer-cards'

type Supabase = SupabaseClient<Database>

// Guests read only through the public_* RPCs (claimed + contracted
// photographers, fixed public columns, capped). Payment fields are filled
// with null so the shared components hide them.
const NO_PAYMENT = {
  payment_method: null,
  requires_deposit: null,
  payment_terms: null,
  payment_link: null,
} as const

export async function loadPublicListing(supabase: Supabase): Promise<SlotWithPhotographer[]> {
  const [{ data: photographers, error: listError }, { data: slots, error: slotError }] =
    await Promise.all([supabase.rpc('public_photographers'), supabase.rpc('public_open_slots')])
  if (listError || slotError) console.error('Loading public listing failed:', listError ?? slotError)

  const byId = new Map((photographers ?? []).map((p) => [p.id, { ...p, ...NO_PAYMENT }]))
  return (slots ?? []).flatMap((slot) => {
    const photographer = byId.get(slot.photographer_id)
    return photographer ? [{ ...slot, is_booked: false, photographer }] : []
  })
}

export async function loadPublicPhotographer(
  supabase: Supabase,
  id: string
): Promise<{
  photographer: PublicPhotographer
  photos: Pick<PortfolioPhoto, 'id' | 'image_url' | 'caption'>[]
  slots: AvailabilitySlot[]
} | null> {
  const [{ data: rows }, { data: photos }, { data: slots }] = await Promise.all([
    supabase.rpc('public_photographers', { p_id: id }),
    supabase.rpc('public_portfolio', { p_photographer_id: id }),
    supabase.rpc('public_open_slots', { p_photographer_id: id }),
  ])
  const photographer = rows?.[0]
  if (!photographer) return null
  return {
    photographer,
    photos: photos ?? [],
    slots: (slots ?? []).map((s) => ({ ...s, is_booked: false })),
  }
}

// Role of whoever is signed in on a public page (null = guest or admin).
export async function loadViewerRole(
  supabase: Supabase
): Promise<'client' | 'photographer' | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.role === 'client' || profile?.role === 'photographer' ? profile.role : null
}

export type PublicPackage = Database['public']['Functions']['public_packages']['Returns'][number]
export type PublicReview = Database['public']['Functions']['public_reviews']['Returns'][number]

// Cover, rating, response time and lowest package for every listed
// photographer (same RPC for guests and signed-in users).
export async function loadCardStats(supabase: Supabase): Promise<Record<string, CardStats>> {
  const { data, error } = await supabase.rpc('public_photographer_cards')
  if (error) console.error('Loading photographer cards failed:', error.message)
  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.photographer_id,
      {
        coverImageUrl: row.cover_image_url,
        ratingAvg: row.rating_avg == null ? null : Number(row.rating_avg),
        reviewCount: row.review_count,
        responseHours: row.response_hours == null ? null : Number(row.response_hours),
        minPackagePrice: row.min_package_price == null ? null : Number(row.min_package_price),
      },
    ])
  )
}

// Packages, reviews and card facts shown on a profile.
export async function loadProfileExtras(
  supabase: Supabase,
  photographerId: string
): Promise<{ packages: PublicPackage[]; reviews: PublicReview[]; stats: CardStats }> {
  const [{ data: packages }, { data: reviews }, stats] = await Promise.all([
    supabase.rpc('public_packages', { p_photographer_id: photographerId }),
    supabase.rpc('public_reviews', { p_photographer_id: photographerId }),
    loadCardStats(supabase),
  ])
  return {
    packages: (packages ?? []).map((p) => ({ ...p, price: Number(p.price) })),
    reviews: reviews ?? [],
    stats: stats[photographerId] ?? EMPTY_CARD_STATS,
  }
}
