// Client-facing status of a booking as four steps:
// requested -> confirmed -> session day -> delivered.
import type { BookingStatus } from '@/types/database'

export type TimelineKey = 'requested' | 'confirmed' | 'session' | 'delivered'
export type TimelineState = 'done' | 'current' | 'upcoming'

export type TimelineStep = { key: TimelineKey; state: TimelineState }

export const TIMELINE_KEYS: readonly TimelineKey[] = ['requested', 'confirmed', 'session', 'delivered']

export function bookingTimeline(booking: {
  status: BookingStatus
  sessionStart: Date
  deliveredAt: string | null
  now?: Date
}): { steps: TimelineStep[]; cancelled: boolean } {
  const now = booking.now ?? new Date()
  if (booking.status === 'cancelled') {
    return {
      steps: TIMELINE_KEYS.map((key) => ({ key, state: key === 'requested' ? 'done' : 'upcoming' })),
      cancelled: true,
    }
  }

  // How many steps are done.
  let done = 1 // requested
  if (booking.status === 'confirmed' || booking.status === 'completed') done = 2
  if (done === 2 && (booking.status === 'completed' || booking.sessionStart <= now)) done = 3
  if (done === 3 && booking.deliveredAt) done = 4

  return {
    steps: TIMELINE_KEYS.map((key, i) => ({
      key,
      state: i < done ? 'done' : i === done ? 'current' : 'upcoming',
    })),
    cancelled: false,
  }
}

// A client may review once the photographer marked the session completed.
export function canReview(status: BookingStatus, hasReview: boolean): boolean {
  return status === 'completed' && !hasReview
}
