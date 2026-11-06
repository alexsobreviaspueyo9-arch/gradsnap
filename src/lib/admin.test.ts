import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { isAdminEmail } from './admin'

describe('isAdminEmail', () => {
  const admins = ' Owner@Example.com, second@example.com ,'

  it('matches listed emails ignoring case and spaces', () => {
    expect(isAdminEmail('owner@example.com', admins)).toBe(true)
    expect(isAdminEmail('SECOND@example.com', admins)).toBe(true)
  })

  it('rejects anyone not on the list', () => {
    expect(isAdminEmail('student@example.com', admins)).toBe(false)
  })

  it('treats a missing email or an unset list as not admin', () => {
    expect(isAdminEmail(null, admins)).toBe(false)
    expect(isAdminEmail('owner@example.com', undefined)).toBe(false)
    expect(isAdminEmail('', admins)).toBe(false)
  })
})
