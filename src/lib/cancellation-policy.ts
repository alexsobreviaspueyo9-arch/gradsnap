// Cancellation rules (dormant until PAYMENTS_ENABLED=true). Pure and
// string-free. Session start is an instant: build it with zonedDateTime()
// from lib/date.ts (slot dates are America/New_York wall clock).
import type { FeeBreakdown } from '@/lib/fees'

const HOUR_MS = 3_600_000
const DAY_HOURS = 24

// Share of the session price refunded to a client who cancels, by how long
// before the session they cancel. The service fee is not refunded, except in
// the grace period or when the photographer cancels.
export const CLIENT_REFUND_TIERS = [
  { minHoursBefore: 14 * DAY_HOURS, rate: 1 },
  { minHoursBefore: 7 * DAY_HOURS, rate: 0.75 },
  { minHoursBefore: 72, rate: 0.5 },
] as const
export const LATE_REFUND_RATE = 0

// Cancel within 24h of booking, with the session still >= 7 days away:
// everything back, fee included.
export const GRACE_HOURS = 24
export const GRACE_MIN_HOURS_BEFORE = 7 * DAY_HOURS

// What a photographer pays for cancelling, in dollars.
export const PHOTOGRAPHER_PENALTIES = [
  { minHoursBefore: 14 * DAY_HOURS, amount: 0 },
  { minHoursBefore: 7 * DAY_HOURS, amount: 25 },
  { minHoursBefore: 72, amount: 50 },
] as const
export const PHOTOGRAPHER_LATE_PENALTY = 100

export type Canceller = 'client' | 'photographer' | 'no_show'

export type Refund = {
  sessionRate: number
  feeRefunded: boolean
  reason: 'photographer_cancelled' | 'grace' | 'tier' | 'late' | 'no_show'
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / HOUR_MS
}

function inGrace(sessionStart: Date, now: Date, bookedAt: Date | undefined): boolean {
  if (!bookedAt) return false
  const sinceBooking = hoursBetween(bookedAt, now)
  return (
    sinceBooking >= 0 &&
    sinceBooking <= GRACE_HOURS &&
    hoursBetween(now, sessionStart) >= GRACE_MIN_HOURS_BEFORE
  )
}

export function refundFor(
  sessionStart: Date,
  now: Date,
  cancelledBy: Canceller,
  bookedAt?: Date
): Refund {
  if (cancelledBy === 'photographer') {
    return { sessionRate: 1, feeRefunded: true, reason: 'photographer_cancelled' }
  }
  if (cancelledBy === 'no_show') {
    return { sessionRate: LATE_REFUND_RATE, feeRefunded: false, reason: 'no_show' }
  }
  if (inGrace(sessionStart, now, bookedAt)) {
    return { sessionRate: 1, feeRefunded: true, reason: 'grace' }
  }
  const hoursBefore = hoursBetween(now, sessionStart)
  const tier = CLIENT_REFUND_TIERS.find((t) => hoursBefore >= t.minHoursBefore)
  return tier
    ? { sessionRate: tier.rate, feeRefunded: false, reason: 'tier' }
    : { sessionRate: LATE_REFUND_RATE, feeRefunded: false, reason: 'late' }
}

// Who ends up with what, in dollars (cents-exact).
export function refundAmounts(
  breakdown: FeeBreakdown,
  refund: Refund
): { sessionRefund: number; feeRefund: number; clientRefund: number; photographerKeeps: number; gradsnapKeeps: number } {
  const price = Math.round(breakdown.sessionPrice * 100)
  const fee = Math.round(breakdown.clientFee * 100)
  const sessionRefund = Math.round(price * refund.sessionRate)
  const feeRefund = refund.feeRefunded ? fee : 0
  return {
    sessionRefund: sessionRefund / 100,
    feeRefund: feeRefund / 100,
    clientRefund: (sessionRefund + feeRefund) / 100,
    photographerKeeps: (price - sessionRefund) / 100,
    gradsnapKeeps: (fee - feeRefund) / 100,
  }
}

export function photographerPenalty(sessionStart: Date, now: Date, noShow = false): number {
  if (noShow) return PHOTOGRAPHER_LATE_PENALTY
  const hoursBefore = hoursBetween(now, sessionStart)
  const tier = PHOTOGRAPHER_PENALTIES.find((t) => hoursBefore >= t.minHoursBefore)
  return tier ? tier.amount : PHOTOGRAPHER_LATE_PENALTY
}

// Last moment a client can cancel and get the whole session price back:
// 14 days before, or the end of the 24h grace if that is later. Null when
// neither applies (booked less than 14 days ahead and not grace-eligible).
export function freeCancellationDeadline(sessionStart: Date, bookedAt: Date): Date | null {
  const tierEnd = new Date(sessionStart.getTime() - CLIENT_REFUND_TIERS[0].minHoursBefore * HOUR_MS)
  const graceEnd = new Date(
    Math.min(
      bookedAt.getTime() + GRACE_HOURS * HOUR_MS,
      sessionStart.getTime() - GRACE_MIN_HOURS_BEFORE * HOUR_MS
    )
  )
  const candidates = [tierEnd, graceEnd].filter((d) => d.getTime() >= bookedAt.getTime())
  if (candidates.length === 0) return null
  return new Date(Math.max(...candidates.map((d) => d.getTime())))
}
