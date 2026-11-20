import { describe, expect, it } from 'vitest'
import { CAMPUS_SPOTS, cleanSpotIds, shootsAt, spotById } from './campus-spots'

describe('campus spots config', () => {
  it('has unique ids that pass the database format check', () => {
    const ids = CAMPUS_SPOTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9-]{1,40}$/.test(id))).toBe(true)
  })

  it('keeps coordinates approximate (3 decimals at most)', () => {
    for (const spot of CAMPUS_SPOTS) {
      expect(Math.round(spot.lat * 1000) / 1000).toBe(spot.lat)
      expect(Math.round(spot.lng * 1000) / 1000).toBe(spot.lng)
    }
  })
})

describe('cleanSpotIds', () => {
  it('keeps known ids once, in config order', () => {
    expect(cleanSpotIds(['duck-pond', 'drillfield', 'duck-pond', 'nowhere', 'DROP TABLE'])).toEqual([
      'drillfield',
      'duck-pond',
    ])
  })
})

describe('shootsAt', () => {
  it('matches every photographer when no spot is picked', () => {
    expect(shootsAt([], null)).toBe(true)
  })

  it('matches only photographers who list the spot', () => {
    expect(shootsAt(['drillfield'], 'drillfield')).toBe(true)
    expect(shootsAt(['duck-pond'], 'drillfield')).toBe(false)
    expect(shootsAt(null, 'drillfield')).toBe(false)
  })
})

describe('spotById', () => {
  it('finds a spot or returns null', () => {
    expect(spotById('drillfield')?.name).toBe('The Drillfield')
    expect(spotById('x')).toBeNull()
  })
})
