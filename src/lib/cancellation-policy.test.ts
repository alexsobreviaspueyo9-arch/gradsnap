import { describe, expect, it } from 'vitest'
import { zonedDateTime } from './date'
import { feeBreakdown } from './fees'
import {
  freeCancellationDeadline,
  photographerPenalty,
  refundAmounts,
  refundFor,
} from './cancellation-policy'

const HOUR = 3_600_000
const start = zonedDateTime('2026-12-12', '10:00')
const before = (hours: number): Date => new Date(start.getTime() - hours * HOUR)
const longAgo = before(60 * 24) // booked 60 days ahead, grace long over

describe('refundFor (client cancels)', () => {
  it.each([
    [14 * 24, 1],
    [14 * 24 - 0.01, 0.75],
    [7 * 24, 0.75],
    [7 * 24 - 0.01, 0.5],
    [72, 0.5],
    [72 - 0.01, 0],
    [0, 0],
    [-5, 0],
  ])('%s hours before -> %s of the session price', (hours, rate) => {
    const refund = refundFor(start, before(hours), 'client', longAgo)
    expect(refund.sessionRate).toBe(rate)
    expect(refund.feeRefunded).toBe(false)
  })

  it('gives everything back within 24h of booking when the session is 7+ days away', () => {
    const bookedAt = before(10 * 24)
    const refund = refundFor(start, new Date(bookedAt.getTime() + 23 * HOUR), 'client', bookedAt)
    expect(refund).toEqual({ sessionRate: 1, feeRefunded: true, reason: 'grace' })
  })

  it('has no grace when the session is under 7 days away or 24h have passed', () => {
    const lateBooking = before(5 * 24)
    expect(refundFor(start, new Date(lateBooking.getTime() + HOUR), 'client', lateBooking).reason).toBe('tier')
    const bookedAt = before(20 * 24)
    expect(refundFor(start, new Date(bookedAt.getTime() + 25 * HOUR), 'client', bookedAt).feeRefunded).toBe(false)
  })

  it('refunds nothing on a no-show', () => {
    expect(refundFor(start, before(100 * 24), 'no_show')).toEqual({
      sessionRate: 0,
      feeRefunded: false,
      reason: 'no_show',
    })
  })
})

describe('refundFor (photographer cancels)', () => {
  it('always refunds the client in full, fee included', () => {
    expect(refundFor(start, before(1), 'photographer')).toEqual({
      sessionRate: 1,
      feeRefunded: true,
      reason: 'photographer_cancelled',
    })
  })
})

describe('refundAmounts', () => {
  it('shows who keeps what on a $200 booking cancelled 10 days out', () => {
    const amounts = refundAmounts(feeBreakdown(200), refundFor(start, before(10 * 24), 'client', longAgo))
    expect(amounts).toEqual({
      sessionRefund: 150,
      feeRefund: 0,
      clientRefund: 150,
      photographerKeeps: 50,
      gradsnapKeeps: 12,
    })
  })

  it('returns everything when the photographer cancels', () => {
    const amounts = refundAmounts(feeBreakdown(200), refundFor(start, before(1), 'photographer'))
    expect(amounts.clientRefund).toBe(212)
    expect(amounts.photographerKeeps).toBe(0)
    expect(amounts.gradsnapKeeps).toBe(0)
  })
})

describe('photographerPenalty', () => {
  it.each([
    [14 * 24, 0],
    [13 * 24, 25],
    [7 * 24, 25],
    [6 * 24, 50],
    [72, 50],
    [71, 100],
  ])('%s hours before -> $%s', (hours, amount) => {
    expect(photographerPenalty(start, before(hours))).toBe(amount)
  })

  it('charges the top penalty for a no-show', () => {
    expect(photographerPenalty(start, before(30 * 24), true)).toBe(100)
  })
})

describe('freeCancellationDeadline', () => {
  it('is 14 days before the session when booked early', () => {
    expect(freeCancellationDeadline(start, before(30 * 24))).toEqual(before(14 * 24))
  })

  it('is the end of the 24h grace when booked 7-14 days ahead', () => {
    const bookedAt = before(10 * 24)
    expect(freeCancellationDeadline(start, bookedAt)).toEqual(new Date(bookedAt.getTime() + 24 * HOUR))
  })

  it('stops the grace 7 days before the session', () => {
    const bookedAt = before(7 * 24 + 5)
    expect(freeCancellationDeadline(start, bookedAt)).toEqual(before(7 * 24))
  })

  it('is null when booked less than 7 days ahead', () => {
    expect(freeCancellationDeadline(start, before(3 * 24))).toBeNull()
  })
})
