import { describe, expect, it } from 'vitest'
import { PHOTOGRAPHER_TERMS_VERSION, isTermsUpdate, needsTermsAcceptance } from './photographer-terms'

describe('needsTermsAcceptance', () => {
  it('lets through a photographer who accepted the current version', () => {
    expect(
      needsTermsAcceptance({ has_signed_contract: true, terms_version: PHOTOGRAPHER_TERMS_VERSION })
    ).toBe(false)
  })

  it('stops a photographer who never accepted', () => {
    expect(needsTermsAcceptance({ has_signed_contract: false, terms_version: null })).toBe(true)
  })

  it('stops photographers who signed the old contract (no version yet)', () => {
    expect(needsTermsAcceptance({ has_signed_contract: true, terms_version: null })).toBe(true)
  })

  it('stops anyone on an older version once the version changes', () => {
    expect(needsTermsAcceptance({ has_signed_contract: true, terms_version: '2026-11-17' }, '2027-01-01')).toBe(true)
  })
})

describe('isTermsUpdate', () => {
  it('is an update only for photographers who accepted something before', () => {
    expect(isTermsUpdate({ has_signed_contract: true, terms_version: null })).toBe(true)
    expect(isTermsUpdate({ has_signed_contract: false, terms_version: null })).toBe(false)
    expect(isTermsUpdate({ has_signed_contract: true, terms_version: PHOTOGRAPHER_TERMS_VERSION })).toBe(false)
  })
})
