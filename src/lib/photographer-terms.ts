// Versioned click-wrap terms for photographers. Must equal
// public.photographer_terms_version() in the database; bump both together to
// ask every photographer to accept again.
export const PHOTOGRAPHER_TERMS_VERSION = '2026-11-17'

export const PHOTOGRAPHER_TERMS_PATH = '/onboarding/photographer/contract'

export type TermsAcceptance = {
  has_signed_contract: boolean
  terms_version: string | null
}

// Server-side gate for every photographer page (and the overview).
export function needsTermsAcceptance(
  profile: TermsAcceptance,
  currentVersion: string = PHOTOGRAPHER_TERMS_VERSION
): boolean {
  return !profile.has_signed_contract || profile.terms_version !== currentVersion
}

// Accepted before, but an older version: the page says "we updated the terms".
export function isTermsUpdate(
  profile: TermsAcceptance,
  currentVersion: string = PHOTOGRAPHER_TERMS_VERSION
): boolean {
  return profile.has_signed_contract && profile.terms_version !== currentVersion
}
