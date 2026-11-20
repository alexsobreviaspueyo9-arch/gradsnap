import { describe, expect, it } from 'vitest'
import {
  formatTimeLeft,
  isUnread,
  medianResponseHours,
  profileChecklist,
  requestTimeLeftMs,
} from './photographer-dashboard'

const complete = {
  displayName: 'Maya',
  bio: 'Candid portraits',
  city: 'Blacksburg',
  basePrice: 180,
  packageCount: 0,
  specialty: 'Editorial',
  photoCount: 6,
  openSlotCount: 4,
  hasWeeklyAvailability: false,
  paymentMethod: 'cash',
}

describe('profileChecklist', () => {
  it('is 100% when everything is filled in', () => {
    const result = profileChecklist(complete)
    expect(result.percent).toBe(100)
    expect(result.nextStep).toBeNull()
  })

  it('names the next step, counting missing photos', () => {
    const result = profileChecklist({ ...complete, photoCount: 0 })
    expect(result.percent).toBe(88)
    expect(result.nextStep).toBe('Add 3 more photos')
    expect(profileChecklist({ ...complete, photoCount: 2 }).nextStep).toBe('Add 1 more photo')
  })

  it('accepts a package instead of a base price, and weekly hours instead of slots', () => {
    const result = profileChecklist({ ...complete, basePrice: null, packageCount: 1, openSlotCount: 0, hasWeeklyAvailability: true })
    expect(result.percent).toBe(100)
  })

  it('starts low for an empty profile', () => {
    const empty = profileChecklist({
      displayName: null,
      bio: '  ',
      city: null,
      basePrice: null,
      packageCount: 0,
      specialty: null,
      photoCount: 0,
      openSlotCount: 0,
      hasWeeklyAvailability: false,
      paymentMethod: null,
    })
    expect(empty.percent).toBe(0)
    expect(empty.nextStep).toBe('Add your display name')
  })
})

describe('request expiry', () => {
  const created = '2026-11-20T10:00:00Z'

  it('counts down 48 hours from the request', () => {
    expect(requestTimeLeftMs(created, new Date('2026-11-21T10:00:00Z'))).toBe(24 * 3_600_000)
    expect(requestTimeLeftMs(created, new Date('2026-11-23T10:00:00Z'))).toBe(0)
  })

  it('formats what is left', () => {
    expect(formatTimeLeft(26 * 3_600_000 + 5 * 60_000)).toBe('26h 5m left')
    expect(formatTimeLeft(40 * 60_000)).toBe('40m left')
    expect(formatTimeLeft(0)).toBe('Expired')
  })
})

describe('medianResponseHours', () => {
  const row = (hours: number | null) => ({
    created_at: '2026-11-01T00:00:00Z',
    responded_at: hours == null ? null : new Date(Date.parse('2026-11-01T00:00:00Z') + hours * 3_600_000).toISOString(),
  })

  it('needs 3 answered requests', () => {
    expect(medianResponseHours([row(1), row(2), row(null)])).toBeNull()
  })

  it('takes the median (odd and even counts)', () => {
    expect(medianResponseHours([row(1), row(9), row(2)])).toBe(2)
    expect(medianResponseHours([row(1), row(2), row(3), row(10)])).toBe(2.5)
  })
})

describe('isUnread', () => {
  it('is unread when the other person wrote after the last visit', () => {
    expect(isUnread({ sender_id: 'client', created_at: '2026-11-20T10:00:00Z' }, 'me', '2026-11-20T09:00:00Z')).toBe(true)
    expect(isUnread({ sender_id: 'client', created_at: '2026-11-20T10:00:00Z' }, 'me', null)).toBe(true)
  })

  it('is read when I wrote last or already opened it', () => {
    expect(isUnread({ sender_id: 'me', created_at: '2026-11-20T10:00:00Z' }, 'me', null)).toBe(false)
    expect(isUnread({ sender_id: 'client', created_at: '2026-11-20T10:00:00Z' }, 'me', '2026-11-20T11:00:00Z')).toBe(false)
    expect(isUnread(null, 'me', null)).toBe(false)
  })
})
