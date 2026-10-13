import { describe, expect, it } from 'vitest'
import { isUpcomingSlot, weeklyDates } from '@/lib/date'

// 2026-07-01 16:00 UTC = 12:00 in America/New_York (EDT, UTC-4)
const NOW = new Date('2026-07-01T16:00:00Z')

describe('isUpcomingSlot', () => {
  it('keeps slots later today in New York time', () => {
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '12:30:00' }, NOW)).toBe(true)
  })

  it('drops slots today that already started in New York time', () => {
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '11:00:00' }, NOW)).toBe(false)
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '12:00:00' }, NOW)).toBe(false)
  })

  it('uses New York time, not UTC, for the cut-off', () => {
    // 13:00 is already past in UTC (16:00) but still ahead in New York (12:00)
    expect(isUpcomingSlot({ date: '2026-07-01', start_time: '13:00' }, NOW)).toBe(true)
  })

  it('handles winter time (EST, UTC-5)', () => {
    // 2026-01-15 15:00 UTC = 10:00 in New York
    const winterNow = new Date('2026-01-15T15:00:00Z')
    expect(isUpcomingSlot({ date: '2026-01-15', start_time: '10:30' }, winterNow)).toBe(true)
    expect(isUpcomingSlot({ date: '2026-01-15', start_time: '09:30' }, winterNow)).toBe(false)
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
