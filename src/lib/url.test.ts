import { describe, expect, it } from 'vitest'
import { normalizeHttpUrl, safeNextPath } from '@/lib/url'

describe('normalizeHttpUrl', () => {
  it('keeps valid https and http links', () => {
    expect(normalizeHttpUrl('https://paypal.me/ana')).toBe('https://paypal.me/ana')
    expect(normalizeHttpUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1')
  })

  it('adds https:// when the scheme is missing', () => {
    expect(normalizeHttpUrl('instagram.com/ana')).toBe('https://instagram.com/ana')
  })

  it('trims whitespace', () => {
    expect(normalizeHttpUrl('  https://buy.stripe.com/x  ')).toBe('https://buy.stripe.com/x')
  })

  it('returns null for empty input', () => {
    expect(normalizeHttpUrl('')).toBeNull()
    expect(normalizeHttpUrl('   ')).toBeNull()
    expect(normalizeHttpUrl(null)).toBeNull()
    expect(normalizeHttpUrl(undefined)).toBeNull()
  })

  it('rejects script and data URLs', () => {
    expect(normalizeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeHttpUrl('JavaScript:alert(1)')).toBeNull()
    expect(normalizeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(normalizeHttpUrl('vbscript:msgbox(1)')).toBeNull()
  })

  it('rejects other protocols and hostless values', () => {
    expect(normalizeHttpUrl('ftp://example.com')).toBeNull()
    expect(normalizeHttpUrl('mailto:a@b.com')).toBeNull()
    expect(normalizeHttpUrl('not a url')).toBeNull()
    expect(normalizeHttpUrl('localhost')).toBeNull()
  })
})

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/reclamar/abc123?src=instagram')).toBe('/reclamar/abc123?src=instagram')
    expect(safeNextPath('/dashboard/photographer')).toBe('/dashboard/photographer')
  })

  it('rejects other sites and junk', () => {
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('/\\evil.com')).toBeNull()
    expect(safeNextPath('javascript:alert(1)')).toBeNull()
    expect(safeNextPath('/path with space')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath('')).toBeNull()
  })
})
