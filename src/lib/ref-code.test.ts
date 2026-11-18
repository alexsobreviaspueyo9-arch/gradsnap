import { describe, expect, it } from 'vitest'
import { safeNextPath } from './url'
import { guestBookingNext } from './guest-booking'
import { acceptsRef, countBySource, parseRefCode, personalLink } from './ref-code'

describe('parseRefCode', () => {
  it('accepts the 10-character codes the database makes', () => {
    expect(parseRefCode('a1b2c3d4e5')).toBe('a1b2c3d4e5')
    expect(parseRefCode(' A1B2C3D4E5 ')).toBe('a1b2c3d4e5')
  })

  it('rejects anything else', () => {
    expect(parseRefCode('short')).toBeNull()
    expect(parseRefCode('a1b2c3d4e5f')).toBeNull()
    expect(parseRefCode('<script>xx')).toBeNull()
    expect(parseRefCode(null)).toBeNull()
  })
})

describe('personalLink', () => {
  it('builds the public link with the code', () => {
    expect(personalLink('https://www.gradsnap.app', 'p1', 'a1b2c3d4e5')).toBe(
      'https://www.gradsnap.app/photographers/p1?ref=a1b2c3d4e5'
    )
  })
})

describe('ref through the sign-up next', () => {
  it('is kept in next and still passes safeNextPath', () => {
    const next = guestBookingNext('p1', '2026-12-05', 's1', 'a1b2c3d4e5')
    expect(next).toBe('/photographers/p1?date=2026-12-05&slot=s1&ref=a1b2c3d4e5')
    expect(safeNextPath(next)).toBe(next)
  })

  it('is left out when there is none', () => {
    expect(guestBookingNext('p1', '2026-12-05', 's1')).not.toContain('ref=')
  })
})

describe('acceptsRef', () => {
  it('remembers codes only on photographer pages', () => {
    expect(acceptsRef('/photographers/p1')).toBe(true)
    expect(acceptsRef('/dashboard/client/photographers/p1')).toBe(true)
    expect(acceptsRef('/login')).toBe(false)
    expect(acceptsRef('/photographersx')).toBe(false)
  })
})

describe('countBySource', () => {
  it('splits bookings into link and GradSnap', () => {
    expect(
      countBySource([{ source: 'photographer_link' }, { source: 'marketplace' }, { source: 'marketplace' }])
    ).toEqual({ photographerLink: 1, marketplace: 2 })
    expect(countBySource([])).toEqual({ photographerLink: 0, marketplace: 0 })
  })
})
