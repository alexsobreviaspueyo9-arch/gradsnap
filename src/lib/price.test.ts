import { describe, expect, it } from 'vitest'
import { formatAllInPriceRange, formatMoney, formatPriceRange } from '@/lib/price'

describe('formatPriceRange', () => {
  it('shows a range when the max is above the base price', () => {
    expect(formatPriceRange(80, 150)).toBe('$80 - $150')
  })

  it('shows a single price when only one is set or they are equal', () => {
    expect(formatPriceRange(80, null)).toBe('$80')
    expect(formatPriceRange(null, 150)).toBe('$150')
    expect(formatPriceRange(80, 80)).toBe('$80')
  })

  it('returns null when no price is set', () => {
    expect(formatPriceRange(null, null)).toBeNull()
  })
})

describe('formatAllInPriceRange', () => {
  it('adds the service fee and rounds up for lists', () => {
    expect(formatAllInPriceRange(180.5, null)).toBe('$192')
    expect(formatAllInPriceRange(80, 150)).toBe('$86 - $159')
    expect(formatAllInPriceRange(null, null)).toBeNull()
  })
})

describe('formatMoney', () => {
  it('shows exact cents', () => {
    expect(formatMoney(191.33)).toBe('$191.33')
    expect(formatMoney(6)).toBe('$6.00')
  })
})
