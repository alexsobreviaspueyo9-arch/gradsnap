import { describe, expect, it } from 'vitest'
import { dedupe, normalizeHandle, parseLines } from './parse'

describe('normalizeHandle', () => {
  it('accepts @user, user and instagram.com URLs, lowercased', () => {
    expect(normalizeHandle('@Maya.Chen')).toBe('maya.chen')
    expect(normalizeHandle('maya_chen')).toBe('maya_chen')
    expect(normalizeHandle('https://www.instagram.com/MayaChen/')).toBe('mayachen')
    expect(normalizeHandle('instagram.com/mayachen?hl=en')).toBe('mayachen')
    expect(normalizeHandle('https://m.instagram.com/mayachen/#top')).toBe('mayachen')
  })

  it('rejects invalid handles, other sites and non-profile paths', () => {
    expect(normalizeHandle('')).toBeNull()
    expect(normalizeHandle(null)).toBeNull()
    expect(normalizeHandle('has space')).toBeNull()
    expect(normalizeHandle('a'.repeat(31))).toBeNull()
    expect(normalizeHandle('.dotfirst')).toBeNull()
    expect(normalizeHandle('https://example.com/maya')).toBeNull()
    expect(normalizeHandle('https://instagram.com/p/C123abc/')).toBeNull()
    expect(normalizeHandle('https://instagram.com/reel/xyz')).toBeNull()
  })
})

describe('parseLines', () => {
  it('splits lines, collapses duplicates and reports invalid tokens', () => {
    const text = '@maya\nhttps://instagram.com/Maya/\njordan.photo, ??? \n\n sam_snaps'
    expect(parseLines(text)).toEqual({
      handles: ['maya', 'jordan.photo', 'sam_snaps'],
      invalid: ['???'],
    })
  })

  it('keeps at most `max` handles', () => {
    const text = Array.from({ length: 30 }, (_, i) => `user${i}`).join('\n')
    expect(parseLines(text).handles).toHaveLength(25)
    expect(parseLines(text, 3).handles).toEqual(['user0', 'user1', 'user2'])
  })
})

describe('dedupe', () => {
  it('drops items already present, case-insensitively, and repeats', () => {
    expect(dedupe(['maya', 'jordan', 'sam', 'jordan'], ['MAYA', null, 'other'])).toEqual([
      'jordan',
      'sam',
    ])
  })
})
