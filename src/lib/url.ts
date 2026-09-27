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
