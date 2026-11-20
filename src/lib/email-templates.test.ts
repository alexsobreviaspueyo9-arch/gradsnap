import { describe, expect, it } from 'vitest'
import {
  bookingConfirmedEmail,
  bookingRequestedClientEmail,
  bookingRequestedPhotographerEmail,
  escapeHtml,
  sessionReminderEmail,
} from '@/lib/email-templates'

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

describe('booking request emails', () => {
  const base = {
    clientName: 'Ava',
    photographerName: 'Maya <b>Chen</b>',
    date: '2026-12-12',
    startTime: '10:00:00',
    endTime: '11:00:00',
  }

  it('tells the client when, the listed price, the pilot and the terms', () => {
    const email = bookingRequestedClientEmail({
      ...base,
      priceLabel: '$180 - $320',
      paymentTerms: 'Cancel 14+ days before: full refund.\n<script>x</script>',
      contactUrl: 'https://www.gradsnap.app/contact',
    })
    expect(email.html).toContain('Saturday, December 12 at 10:00-11:00 (New York time)')
    expect(email.html).toContain('$180 - $320')
    expect(email.html).toContain('free during our launch pilot')
    expect(email.html).toContain('set by the photographer')
    expect(email.html).toContain('full refund.<br />')
    expect(email.html).not.toContain('<script>')
    expect(email.html).not.toContain('<b>Chen</b>')
    expect(email.html).toContain('https://www.gradsnap.app/contact')
    expect(email.text).toContain('Cancel 14+ days before: full refund.')
  })

  it('leaves the terms out when the photographer set none', () => {
    const email = bookingRequestedClientEmail({
      ...base,
      priceLabel: null,
      paymentTerms: '  ',
      contactUrl: 'https://www.gradsnap.app/contact',
    })
    expect(email.html).not.toContain('set by the photographer')
    expect(email.html).toContain('Agreed with the photographer')
  })

  it('keeps line breaks out of the subject', () => {
    const email = bookingRequestedClientEmail({
      ...base,
      photographerName: 'Maya\r\nBcc: x@example.com',
      priceLabel: null,
      paymentTerms: null,
      contactUrl: 'https://www.gradsnap.app/contact',
    })
    expect(email.subject).not.toMatch(/[\r\n]/)
  })

  it('sends the photographer to their bookings', () => {
    const email = bookingRequestedPhotographerEmail({
      ...base,
      clientName: '<img src=x>',
      bookingsUrl: 'https://www.gradsnap.app/dashboard/photographer/bookings',
    })
    expect(email.subject).toBe('New booking request on GradSnap')
    expect(email.html).toContain('https://www.gradsnap.app/dashboard/photographer/bookings')
    expect(email.html).not.toContain('<img')
    expect(email.text).toContain('Saturday, December 12 at 10:00-11:00 (New York time)')
  })

  it('adds the contact link to the confirmation', () => {
    const email = bookingConfirmedEmail({
      clientName: 'Ava',
      photographerName: 'Maya',
      date: '2026-12-12',
      startTime: '10:00:00',
      contactUrl: 'https://www.gradsnap.app/contact',
    })
    expect(email.html).toContain('https://www.gradsnap.app/contact')
    expect(email.text).toContain('Maya confirmed your session on Saturday, December 12 at 10:00 (New York time).')
  })
})

describe('sessionReminderEmail', () => {
  it('says when, in New York time, without HTML from names', () => {
    const email = sessionReminderEmail({
      clientName: 'Ava',
      photographerName: 'Maya <b>Chen</b>',
      date: '2026-12-12',
      startTime: '10:00:00',
      kind: 'reminder_48h',
      bookingsUrl: 'https://www.gradsnap.app/dashboard/client/bookings',
    })
    expect(email.subject).toBe('Your session is in two days with Maya <b>Chen</b>')
    expect(email.html).toContain('Saturday, December 12 at 10:00 (New York time)')
    expect(email.html).not.toContain('<b>Chen</b>')
    expect(email.text).toContain('https://www.gradsnap.app/dashboard/client/bookings')
  })

  it('has a day-of version', () => {
    const email = sessionReminderEmail({
      clientName: 'Ava',
      photographerName: 'Maya',
      date: '2026-12-12',
      startTime: '10:00:00',
      kind: 'reminder_day',
      bookingsUrl: 'https://x',
    })
    expect(email.subject).toBe('Today is your session with Maya')
  })
})
