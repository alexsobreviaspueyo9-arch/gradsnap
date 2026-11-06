import { SIGNUP_SOURCES, type SignupSrc } from '@/types/database'

// Google signups lose the URL on the OAuth round trip, so the register page
// stashes ?src= here and /onboarding/select-role reads it back.
export const SIGNUP_SRC_STORAGE_KEY = 'gs_signup_src'

export function parseSignupSrc(value: string | null | undefined): SignupSrc | null {
  return SIGNUP_SOURCES.find((s) => s === value) ?? null
}

export function takeStoredSignupSrc(): SignupSrc | null {
  try {
    const value = localStorage.getItem(SIGNUP_SRC_STORAGE_KEY)
    localStorage.removeItem(SIGNUP_SRC_STORAGE_KEY)
    return parseSignupSrc(value)
  } catch {
    return null
  }
}
