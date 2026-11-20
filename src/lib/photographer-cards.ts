// Facts shown on photographer cards and profiles, all computed from real data
// (public_photographer_cards RPC + open slots). Nothing is shown when there
// is nothing real to show.

export type CardStats = {
  coverImageUrl: string | null
  ratingAvg: number | null
  reviewCount: number
  responseHours: number | null
  minPackagePrice: number | null
}

export const EMPTY_CARD_STATS: CardStats = {
  coverImageUrl: null,
  ratingAvg: null,
  reviewCount: 0,
  responseHours: null,
  minPackagePrice: null,
}

// "from $X": the cheapest package if there are packages, else the base price.
export function fromPrice(basePrice: number | null, minPackagePrice: number | null): number | null {
  return minPackagePrice ?? basePrice
}

export type ResponseBadge = 'within_hour' | 'within_few_hours' | 'within_day' | 'within_two_days'

// Median hours from request to first answer (null = too little data).
export function responseBadge(hours: number | null): ResponseBadge | null {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return null
  if (hours <= 1) return 'within_hour'
  if (hours <= 6) return 'within_few_hours'
  if (hours <= 24) return 'within_day'
  if (hours <= 48) return 'within_two_days'
  return null
}

export const RESPONSE_BADGE_LABEL: Record<ResponseBadge, string> = {
  within_hour: 'Usually replies within an hour',
  within_few_hours: 'Usually replies within a few hours',
  within_day: 'Usually replies within a day',
  within_two_days: 'Usually replies within 2 days',
}

// Earliest open slot per photographer (slots already filtered to upcoming).
export function nextSlotByPhotographer<T extends { photographer_id: string; date: string; start_time: string }>(
  slots: T[]
): Map<string, T> {
  const next = new Map<string, T>()
  for (const slot of slots) {
    const current = next.get(slot.photographer_id)
    if (!current || `${slot.date} ${slot.start_time}` < `${current.date} ${current.start_time}`) {
      next.set(slot.photographer_id, slot)
    }
  }
  return next
}

export function styleTags(specialty: string | null, specialtyOther: string | null): string[] {
  const style = specialty === 'Other' ? specialtyOther : specialty
  return style?.trim() ? [style.trim()] : []
}
