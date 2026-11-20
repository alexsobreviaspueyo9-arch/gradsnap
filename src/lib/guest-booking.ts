// Guests browse /photographers without an account. Pressing Book sends them
// to sign up with a ?next= that brings them back to the same photographer,
// date and slot (preselected; they still press Book themselves).
export const PUBLIC_PHOTOGRAPHERS_PATH = '/photographers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type SlotSelection = { date: string | null; slotId: string | null; packageId?: string | null }

export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value)
}

// Only ids and a date: nothing personal ends up in the URL.
export function guestBookingNext(
  photographerId: string,
  date: string,
  slotId: string,
  ref: string | null = null,
  packageId: string | null = null
): string {
  const query = new URLSearchParams({ date, slot: slotId })
  if (packageId) query.set('pkg', packageId)
  // A photographer's personal-link code rides along (also kept in a cookie).
  if (ref) query.set('ref', ref)
  return `${PUBLIC_PHOTOGRAPHERS_PATH}/${photographerId}?${query}`
}

export function guestRegisterHref(next: string): string {
  return `/register?role=client&next=${encodeURIComponent(next)}`
}

// Drops anything malformed instead of trusting the query string.
export function parseSlotSelection(params: {
  date?: string
  slot?: string
  pkg?: string
}): Required<SlotSelection> {
  const date = params.date && DATE_RE.test(params.date) ? params.date : null
  const slotId = isUuid(params.slot) ? params.slot : null
  const packageId = isUuid(params.pkg) ? params.pkg : null
  return { date, slotId, packageId }
}

export function selectionQuery({ date, slotId, packageId }: SlotSelection): string {
  const query = new URLSearchParams()
  if (date) query.set('date', date)
  if (slotId) query.set('slot', slotId)
  if (packageId) query.set('pkg', packageId)
  const text = query.toString()
  return text ? `?${text}` : ''
}

// Who is looking at a booking widget: a signed-in client books; a guest is
// sent to sign up; a photographer account can't book at all.
export type BookingViewer = 'client' | 'guest' | 'photographer'
