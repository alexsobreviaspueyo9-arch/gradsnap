import { describe, expect, it } from 'vitest'
import { calendarAnchor, findPhotographersHref, isPastDate, parseGradParam } from './grad-date'

const TODAY = '2026-11-21'

describe('parseGradParam', () => {
  it('keeps a valid date from today on', () => {
    expect(parseGradParam('2027-05-14', TODAY)).toBe('2027-05-14')
    expect(parseGradParam(TODAY, TODAY)).toBe(TODAY)
  })

  it('ignores past, impossible and malformed dates', () => {
    expect(parseGradParam('2026-11-20', TODAY)).toBeNull()
    expect(parseGradParam('2027-02-30', TODAY)).toBeNull()
    expect(parseGradParam('2027-13-01', TODAY)).toBeNull()
    expect(parseGradParam('05/14/2027', TODAY)).toBeNull()
    expect(parseGradParam('<script>', TODAY)).toBeNull()
    expect(parseGradParam('', TODAY)).toBeNull()
    expect(parseGradParam(undefined, TODAY)).toBeNull()
  })
})

describe('calendarAnchor', () => {
  it('opens on today, whatever the graduation date', () => {
    const anchor = calendarAnchor(TODAY)
    expect(anchor.getFullYear()).toBe(2026)
    expect(anchor.getMonth()).toBe(10)
    expect(anchor.getDate()).toBe(21)
  })
})

describe('isPastDate', () => {
  it('treats days before today as not bookable', () => {
    expect(isPastDate('2026-11-20', TODAY)).toBe(true)
    expect(isPastDate(TODAY, TODAY)).toBe(false)
  })
})

describe('findPhotographersHref', () => {
  it('passes the graduation date only as ?grad=', () => {
    expect(findPhotographersHref('2027-05-14')).toBe('/photographers?grad=2027-05-14')
    expect(findPhotographersHref(null)).toBe('/photographers')
  })
})
