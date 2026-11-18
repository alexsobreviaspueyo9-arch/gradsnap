// Photographer personal links: /photographers/<id>?ref=<code>. The code is
// remembered in a cookie for 30 days so it survives sign-up / login; the
// database decides whether it counts (book_slot checks it belongs to the
// booked photographer), so nothing here is trusted.
export const REF_COOKIE = 'gs_ref'
export const REF_MAX_AGE_DAYS = 30
export const REF_MAX_AGE_SECONDS = REF_MAX_AGE_DAYS * 24 * 60 * 60

const REF_RE = /^[0-9a-f]{10}$/

export function parseRefCode(value: string | null | undefined): string | null {
  const code = value?.trim().toLowerCase() ?? ''
  return REF_RE.test(code) ? code : null
}

export function personalLink(siteUrl: string, photographerId: string, refCode: string): string {
  return `${siteUrl}/photographers/${photographerId}?ref=${refCode}`
}

// Paths where an incoming ?ref= is remembered.
export function acceptsRef(pathname: string): boolean {
  return (
    pathname === '/photographers' ||
    pathname.startsWith('/photographers/') ||
    pathname.startsWith('/dashboard/client/photographers/')
  )
}

export type BookingSourceCounts = { photographerLink: number; marketplace: number }

export function countBySource(bookings: { source: string }[]): BookingSourceCounts {
  return bookings.reduce(
    (counts, b) =>
      b.source === 'photographer_link'
        ? { ...counts, photographerLink: counts.photographerLink + 1 }
        : { ...counts, marketplace: counts.marketplace + 1 },
    { photographerLink: 0, marketplace: 0 }
  )
}
