// Pure helpers for the photographer dashboard: onboarding checklist,
// request expiry countdown and response-time stat (all from real data).

export const REQUEST_TTL_HOURS = 48
export const MIN_PORTFOLIO_PHOTOS = 3
const HOUR_MS = 3_600_000

export type ChecklistInput = {
  displayName: string | null
  bio: string | null
  city: string | null
  basePrice: number | null
  packageCount: number
  specialty: string | null
  photoCount: number
  openSlotCount: number
  hasWeeklyAvailability: boolean
  paymentMethod: string | null
}

export type ChecklistItem = { key: string; label: string; done: boolean }

export function profileChecklist(input: ChecklistInput): {
  percent: number
  items: ChecklistItem[]
  nextStep: string | null
} {
  const missingPhotos = Math.max(0, MIN_PORTFOLIO_PHOTOS - input.photoCount)
  const items: ChecklistItem[] = [
    { key: 'name', label: 'Add your display name', done: !!input.displayName?.trim() },
    { key: 'bio', label: 'Write a short bio', done: !!input.bio?.trim() },
    { key: 'city', label: 'Add your city', done: !!input.city?.trim() },
    {
      key: 'price',
      label: 'Set a price or add a package',
      done: input.basePrice != null || input.packageCount > 0,
    },
    { key: 'style', label: 'Pick your style', done: !!input.specialty },
    {
      key: 'photos',
      label:
        missingPhotos > 0
          ? `Add ${missingPhotos} more photo${missingPhotos === 1 ? '' : 's'}`
          : `Add at least ${MIN_PORTFOLIO_PHOTOS} photos`,
      done: missingPhotos === 0,
    },
    {
      key: 'availability',
      label: 'Open times clients can book',
      done: input.openSlotCount > 0 || input.hasWeeklyAvailability,
    },
    { key: 'payment', label: 'Choose how clients pay you', done: !!input.paymentMethod },
  ]
  const done = items.filter((i) => i.done).length
  const percent = Math.round((done / items.length) * 100)
  const next = items.find((i) => !i.done)
  return { percent, items, nextStep: next ? next.label : null }
}

// Time left before a pending request expires (never negative).
export function requestTimeLeftMs(createdAt: string, now: Date = new Date()): number {
  const deadline = new Date(createdAt).getTime() + REQUEST_TTL_HOURS * HOUR_MS
  return Math.max(0, deadline - now.getTime())
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / 60_000)
  if (hours >= 1) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

// Median hours from request to first answer, or null with fewer than
// `minSamples` answered requests.
export function medianResponseHours(
  rows: { created_at: string; responded_at: string | null }[],
  minSamples = 3
): number | null {
  const hours = rows
    .filter((r) => r.responded_at)
    .map((r) => (new Date(r.responded_at!).getTime() - new Date(r.created_at).getTime()) / HOUR_MS)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b)
  if (hours.length < minSamples) return null
  const mid = Math.floor(hours.length / 2)
  const median = hours.length % 2 === 1 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2
  return Math.round(median * 10) / 10
}

// Unread = the newest message in a chat is from the other person and arrived
// after the photographer last opened it.
export function isUnread(
  lastMessage: { sender_id: string; created_at: string } | null,
  currentUserId: string,
  lastReadAt: string | null
): boolean {
  if (!lastMessage || lastMessage.sender_id === currentUserId) return false
  return lastReadAt === null || lastMessage.created_at > lastReadAt
}
