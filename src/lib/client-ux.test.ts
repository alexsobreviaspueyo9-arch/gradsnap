import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText } from './ics'
import { bookingTimeline, canReview } from './booking-timeline'
import { fromPrice, nextSlotByPhotographer, responseBadge, styleTags } from './photographer-cards'
import { bookingSteps, canContinue, firstOpenStep, reviewError } from './booking-steps'

describe('buildIcs', () => {
  const ics = buildIcs(
    [
      {
        uid: 'b1@gradsnap.app',
        start: new Date('2026-12-12T15:00:00Z'),
        end: new Date('2026-12-12T16:00:00Z'),
        summary: 'Graduation photos with Maya, Chen; Studio',
        description: 'Line one\nLine two',
        url: 'https://www.gradsnap.app/dashboard/client/bookings',
      },
    ],
    { stamp: new Date('2026-11-20T10:00:00Z'), name: 'GradSnap' }
  )

  it('writes a valid calendar with UTC times and CRLF lines', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261212T150000Z')
    expect(ics).toContain('DTEND:20261212T160000Z')
    expect(ics).toContain('DTSTAMP:20261120T100000Z')
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
  })

  it('escapes text values', () => {
    expect(ics).toContain('SUMMARY:Graduation photos with Maya\\, Chen\\; Studio')
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two')
    expect(escapeIcsText('a\\b')).toBe('a\\\\b')
  })

  it('folds long lines', () => {
    const long = buildIcs([{ uid: 'x', start: new Date(0), end: new Date(0), summary: 'x'.repeat(200) }])
    expect(long.split('\r\n').every((line) => line.length <= 75)).toBe(true)
  })
})

describe('bookingTimeline', () => {
  const future = new Date('2030-01-01T15:00:00Z')
  const past = new Date('2020-01-01T15:00:00Z')
  const states = (r: ReturnType<typeof bookingTimeline>) => r.steps.map((s) => s.state)

  it('starts at requested', () => {
    expect(states(bookingTimeline({ status: 'pending', sessionStart: future, deliveredAt: null }))).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
    ])
  })

  it('moves to the session once confirmed and the day comes', () => {
    expect(states(bookingTimeline({ status: 'confirmed', sessionStart: future, deliveredAt: null }))).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
    ])
    expect(states(bookingTimeline({ status: 'confirmed', sessionStart: past, deliveredAt: null }))).toEqual([
      'done',
      'done',
      'done',
      'current',
    ])
  })

  it('is all done once photos are delivered', () => {
    expect(
      states(bookingTimeline({ status: 'completed', sessionStart: past, deliveredAt: '2020-01-05T00:00:00Z' }))
    ).toEqual(['done', 'done', 'done', 'done'])
  })

  it('flags cancelled bookings', () => {
    expect(bookingTimeline({ status: 'cancelled', sessionStart: future, deliveredAt: null }).cancelled).toBe(true)
  })

  it('allows one review per completed booking', () => {
    expect(canReview('completed', false)).toBe(true)
    expect(canReview('completed', true)).toBe(false)
    expect(canReview('confirmed', false)).toBe(false)
  })
})

describe('photographer cards', () => {
  it('shows the cheapest package, else the base price', () => {
    expect(fromPrice(180, 150)).toBe(150)
    expect(fromPrice(180, null)).toBe(180)
    expect(fromPrice(null, null)).toBeNull()
  })

  it('turns the median response time into a badge, or nothing', () => {
    expect(responseBadge(0.5)).toBe('within_hour')
    expect(responseBadge(3)).toBe('within_few_hours')
    expect(responseBadge(20)).toBe('within_day')
    expect(responseBadge(40)).toBe('within_two_days')
    expect(responseBadge(72)).toBeNull()
    expect(responseBadge(null)).toBeNull()
  })

  it('finds each photographer’s next slot', () => {
    const next = nextSlotByPhotographer([
      { photographer_id: 'a', date: '2026-12-05', start_time: '13:00:00' },
      { photographer_id: 'a', date: '2026-12-05', start_time: '09:00:00' },
      { photographer_id: 'b', date: '2026-12-01', start_time: '10:00:00' },
    ])
    expect(next.get('a')?.start_time).toBe('09:00:00')
    expect(next.get('b')?.date).toBe('2026-12-01')
  })

  it('uses the custom style for Other', () => {
    expect(styleTags('Other', ' Film ')).toEqual(['Film'])
    expect(styleTags('Editorial', null)).toEqual(['Editorial'])
    expect(styleTags(null, null)).toEqual([])
  })
})

describe('booking steps', () => {
  it('skips the package step without packages', () => {
    expect(bookingSteps(true)).toEqual(['package', 'time', 'review'])
    expect(bookingSteps(false)).toEqual(['time', 'review'])
  })

  it('needs a choice before moving on', () => {
    expect(canContinue('package', { packageId: null, slotId: 's' })).toBe(false)
    expect(canContinue('time', { packageId: 'p', slotId: null })).toBe(false)
    expect(canContinue('time', { packageId: 'p', slotId: 's' })).toBe(true)
  })

  it('starts at the first step still missing a choice', () => {
    expect(firstOpenStep(['package', 'time', 'review'], { packageId: null, slotId: 's' })).toBe('package')
    expect(firstOpenStep(['package', 'time', 'review'], { packageId: 'p', slotId: null })).toBe('time')
    expect(firstOpenStep(['time', 'review'], { packageId: null, slotId: 's' })).toBe('review')
  })

  it('validates reviews', () => {
    expect(reviewError(null, '')).toMatch(/rating/)
    expect(reviewError(6, '')).toMatch(/rating/)
    expect(reviewError(5, 'x'.repeat(1001))).toMatch(/1000/)
    expect(reviewError(4, 'Lovely')).toBeNull()
  })
})
