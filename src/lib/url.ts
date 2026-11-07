const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

// Links typed by photographers end up in hrefs other users click, so only
// http(s) is allowed. "instagram.com/me" is accepted and gets https:// added.
export function normalizeHttpUrl(input: string | null | undefined): string | null {
  const trimmed = input?.trim() ?? ''
  if (trimmed === '') return null

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
  const candidate = hasScheme ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol) || !url.hostname.includes('.')) {
    return null
  }
  return url.href
}

// `?next=` after sign-in/sign-up: only same-site paths, so the parameter can't
// send someone to another site ("//evil.com" and "/\evil.com" are rejected).
export function safeNextPath(input: string | null | undefined): string | null {
  const value = input?.trim() ?? ''
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  if (value.length > 300 || /[\s\u0000-\u001f]/.test(value)) return null
  return value
}

// Where Supabase sends the user back after email confirmation or Google;
// a safe ?next= (e.g. a /reclamar invite) survives the round trip.
export function authCallbackUrl(origin: string, next: string | null): string {
  const base = `${origin}/auth/callback`
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}
