import { describe, expect, it } from 'vitest'
import { isUpcomingSlot, weeklyDates } from '@/lib/date'

// 2026-07-01 10:00 UTC = 12:00 in Europe/Madrid (CEST, UTC+2)
const NOW = new Date('2026-07-01T10:00:00Z')

describe('isUpcomingSlot', () => {
  it('keeps slots later today in Madrid time', () => {
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '12:30:00' }, NOW)).toBe(true)
  })

  it('drops slots today that already started in Madrid time', () => {
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '11:00:00' }, NOW)).toBe(false)
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '12:00:00' }, NOW)).toBe(false)
  })

  it('uses Madrid time, not UTC, for the cut-off', () => {
    // 11:00 is still in the future in UTC (10:00) but already past in Madrid
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '11:00' }, NOW)).toBe(false)
  })

  it('keeps future days and drops past days', () => {
    expect(isUpcomingSlot({ date: '2026-07-02', start_time: '08:00:00' }, NOW)).toBe(true)
    expect(isUpcomingSlot({ date: '2026-06-30', start_time: '23:00:00' }, NOW)).toBe(false)
  })
})

describe('weeklyDates', () => {
  it('returns the same weekday for the requested number of weeks', () => {
    expect(weeklyDates('2026-10-05', 3)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19'])
  })

  it('crosses month and year boundaries', () => {
    expect(weeklyDates('2026-12-24', 2)).toEqual(['2026-12-24', '2026-12-31'])
    expect(weeklyDates('2026-12-31', 2)).toEqual(['2026-12-31', '2027-01-07'])
  })

  it('stays on the right day across the DST change', () => {
    expect(weeklyDates('2026-10-20', 2)).toEqual(['2026-10-20', '2026-10-27'])
  })

  it('returns just the start date for a single week', () => {
    expect(weeklyDates('2026-10-05', 1)).toEqual(['2026-10-05'])
  })
})
