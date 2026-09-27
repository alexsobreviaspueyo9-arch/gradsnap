import { describe, expect, it } from 'vitest'
import { bookingConfirmedEmail, escapeHtml } from '@/lib/email-templates'

describe('escapeHtml', () => {
  it('escapes every HTML-significant character', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
    )
  })

  it('leaves plain names untouched', () => {
    expect(escapeHtml('María José')).toBe('María José')
  })
})

describe('email templates', () => {
  it('never renders user-typed names as HTML', () => {
    const { html } = bookingConfirmedEmail({
      clientName: '<a href="https://evil.example">Click here</a>',
      photographerName: '<img src=x onerror=alert(1)>',
      date: '2026-10-01',
      startTime: '10:00:00',
    })

    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;')
  })
})
