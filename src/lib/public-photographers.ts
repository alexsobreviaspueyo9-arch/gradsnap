import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlotWithPhotographer } from '@/components/client/CalendarSearch'
import type { PublicPhotographer } from '@/components/client/photographer-detail-view'
import type { AvailabilitySlot, Database, PortfolioPhoto } from '@/types/database'

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
