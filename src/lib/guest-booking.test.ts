import { describe, expect, it } from 'vitest'
import { safeNextPath } from './url'
import {
  guestBookingNext,
  guestRegisterHref,
  isUuid,
  parseSlotSelection,
  selectionQuery,
} from './guest-booking'

const PHOTOGRAPHER = '0b5f6c1e-3a2d-4c8e-9f10-1234567890ab'
const SLOT = '9d8c7b6a-5f4e-4d3c-8b2a-0987654321fe'

describe('guestBookingNext', () => {
  it('points back to the photographer with the date and slot', () => {
    expect(guestBookingNext(PHOTOGRAPHER, '2026-12-05', SLOT)).toBe(
      `/photographers/${PHOTOGRAPHER}?date=2026-12-05&slot=${SLOT}`
    )
  })

  it('survives safeNextPath, so login and signup accept it', () => {
    const next = guestBookingNext(PHOTOGRAPHER, '2026-12-05', SLOT)
    expect(safeNextPath(next)).toBe(next)
  })
})

describe('guestRegisterHref', () => {
  it('signs up as a client and encodes next', () => {
    const href = guestRegisterHref('/photographers/x?date=2026-12-05&slot=y')
    expect(href).toBe('/register?role=client&next=%2Fphotographers%2Fx%3Fdate%3D2026-12-05%26slot%3Dy')
    expect(new URL(href, 'https://www.gradsnap.app').searchParams.get('next')).toBe(
      '/photographers/x?date=2026-12-05&slot=y'
    )
  })
})

describe('parseSlotSelection', () => {
  it('keeps a valid date and slot id', () => {
    expect(parseSlotSelection({ date: '2026-12-05', slot: SLOT, pkg: PHOTOGRAPHER })).toEqual({
      date: '2026-12-05',
      slotId: SLOT,
      packageId: PHOTOGRAPHER,
    })
  })

  it('drops malformed values', () => {
    expect(parseSlotSelection({ date: '12/05/2026', slot: 'drop table', pkg: 'x' })).toEqual({
      date: null,
      slotId: null,
      packageId: null,
    })
    expect(parseSlotSelection({})).toEqual({ date: null, slotId: null, packageId: null })
  })
})

describe('selectionQuery', () => {
  it('rebuilds the query string, or nothing when empty', () => {
    expect(selectionQuery({ date: '2026-12-05', slotId: SLOT })).toBe(`?date=2026-12-05&slot=${SLOT}`)
    expect(selectionQuery({ date: null, slotId: null, packageId: SLOT })).toBe(`?pkg=${SLOT}`)
    expect(selectionQuery({ date: null, slotId: null })).toBe('')
  })
})

describe('isUuid', () => {
  it('accepts only uuids', () => {
    expect(isUuid(SLOT)).toBe(true)
    expect(isUuid('../admin')).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})
