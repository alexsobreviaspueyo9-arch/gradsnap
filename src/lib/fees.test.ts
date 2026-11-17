import { describe, expect, it } from 'vitest'
import { formatZonedDateTime, zonedDateTime } from './date'
import {
  clientFee,
  feeBreakdown,
  listTotalPrice,
  paymentSchedule,
  totalPrice,
} from './fees'

describe('clientFee', () => {
  it('is 6% of the session price', () => {
    expect(clientFee(200)).toBe(12)
    expect(clientFee(180.5)).toBe(10.83)
  })

  it('never goes below $6', () => {
    expect(clientFee(50)).toBe(6)
    expect(clientFee(100)).toBe(6)
    expect(clientFee(0)).toBe(6)
  })

  it('switches from the minimum to 6% at $100', () => {
    expect(clientFee(99.99)).toBe(6)
    expect(clientFee(101)).toBe(6.06)
  })

  it('rejects invalid prices', () => {
    expect(() => clientFee(-1)).toThrow(RangeError)
    expect(() => clientFee(Number.NaN)).toThrow(RangeError)
  })
})

describe('totalPrice and listTotalPrice', () => {
  it('adds the fee exactly at checkout', () => {
    expect(totalPrice(180.5)).toBe(191.33)
    expect(totalPrice(200)).toBe(212)
  })

  it('rounds up to whole dollars in lists', () => {
    expect(listTotalPrice(180.5)).toBe(192)
    expect(listTotalPrice(200)).toBe(212)
  })
})

describe('feeBreakdown', () => {
  it('splits a $200 GradSnap-sourced booking', () => {
    expect(feeBreakdown(200)).toEqual({
      sessionPrice: 200,
      clientFee: 12,
      total: 212,
      deposit: 100,
      dueAtBooking: 112,
      balance: 100,
      commission: 30,
      photographerPayout: 170,
    })
  })

  it('takes no commission on the photographer’s own clients', () => {
    const own = feeBreakdown(200, 'own')
    expect(own.commission).toBe(0)
    expect(own.photographerPayout).toBe(200)
  })

  it('keeps cents exact on odd prices (deposit + balance = price)', () => {
    const b = feeBreakdown(99.99)
    expect(b.deposit + b.balance).toBeCloseTo(99.99, 10)
    expect(b.dueAtBooking).toBe(b.deposit + b.clientFee)
  })
})

describe('paymentSchedule', () => {
  const start = zonedDateTime('2026-12-12', '10:00')

  it('charges the balance 72h before and pays out 48h after', () => {
    const bookedAt = zonedDateTime('2026-11-20', '09:00')
    const { balanceChargeAt, payoutAt } = paymentSchedule(start, bookedAt)
    expect(formatZonedDateTime(balanceChargeAt)).toBe('Wed, Dec 9, 10:00 AM')
    expect(formatZonedDateTime(payoutAt)).toBe('Mon, Dec 14, 10:00 AM')
  })

  it('charges the balance at booking when booked less than 72h ahead', () => {
    const bookedAt = zonedDateTime('2026-12-11', '09:00')
    expect(paymentSchedule(start, bookedAt).balanceChargeAt).toEqual(bookedAt)
  })
})

describe('zonedDateTime', () => {
  it('reads slot times as New York wall clock, across DST', () => {
    expect(zonedDateTime('2026-07-01', '10:00').toISOString()).toBe('2026-07-01T14:00:00.000Z')
    expect(zonedDateTime('2026-12-01', '10:00:00').toISOString()).toBe('2026-12-01T15:00:00.000Z')
    // DST starts 2026-03-08 at 02:00 New York.
    expect(zonedDateTime('2026-03-08', '09:30').toISOString()).toBe('2026-03-08T13:30:00.000Z')
  })
})
