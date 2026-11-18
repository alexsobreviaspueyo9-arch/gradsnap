import { describe, expect, it } from 'vitest'
import { SUGGESTED_CANCELLATION_POLICY, withSuggestedPolicy } from './suggested-policy'

describe('SUGGESTED_CANCELLATION_POLICY', () => {
  it('covers the four agreed rules', () => {
    expect(SUGGESTED_CANCELLATION_POLICY).toContain('14 or more days')
    expect(SUGGESTED_CANCELLATION_POLICY).toContain('3 to 13 days')
    expect(SUGGESTED_CANCELLATION_POLICY).toContain('72 hours')
    expect(SUGGESTED_CANCELLATION_POLICY).toContain('If I have to cancel')
  })
})

describe('withSuggestedPolicy', () => {
  it('fills empty terms with the policy', () => {
    expect(withSuggestedPolicy('  ')).toBe(SUGGESTED_CANCELLATION_POLICY)
  })

  it('keeps existing terms and adds the policy below', () => {
    expect(withSuggestedPolicy('$50 deposit')).toBe(`$50 deposit\n\n${SUGGESTED_CANCELLATION_POLICY}`)
  })

  it('does not add it twice', () => {
    const once = withSuggestedPolicy('$50 deposit')
    expect(withSuggestedPolicy(once)).toBe(once)
  })
})
