import { describe, expect, it } from 'vitest'
import { parseSignupSrc } from './signup-src'

describe('parseSignupSrc', () => {
  it('accepts the four known sources', () => {
    for (const src of ['instagram', 'email', 'web', 'referido']) {
      expect(parseSignupSrc(src)).toBe(src)
    }
  })

  it('drops anything else', () => {
    expect(parseSignupSrc('Instagram')).toBeNull()
    expect(parseSignupSrc('<script>')).toBeNull()
    expect(parseSignupSrc(null)).toBeNull()
    expect(parseSignupSrc(undefined)).toBeNull()
  })
})
