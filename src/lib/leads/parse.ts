// Pure helpers for importing Instagram handles into leads. No network: an
// instagram.com URL is only parsed as text, never fetched.

const HANDLE_RE = /^[a-z0-9._]{1,30}$/
const INSTAGRAM_URL_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^/?#]+)/i
// Instagram paths that are pages, not profiles.
const RESERVED_PATHS = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv', 'direct'])

export const DEFAULT_IMPORT_MAX = 25

// "@User", "user" or "https://instagram.com/user/?hl=en" -> "user"; null if invalid.
export function normalizeHandle(input: string | null | undefined): string | null {
  if (!input) return null
  let value = input.trim()
  const url = value.match(INSTAGRAM_URL_RE)
  if (url) {
    if (RESERVED_PATHS.has(url[1].toLowerCase())) return null
    value = url[1]
  } else if (/[/:]/.test(value)) {
    return null
  }
  const handle = value.replace(/^@/, '').toLowerCase()
  if (!HANDLE_RE.test(handle) || handle.startsWith('.') || handle.endsWith('.')) return null
  return handle
}

// One handle or URL per line (commas and spaces also split). Duplicates in the
// pasted text collapse to one; anything past `max` valid handles is dropped.
export function parseLines(
  text: string,
  max: number = DEFAULT_IMPORT_MAX
): { handles: string[]; invalid: string[] } {
  const handles: string[] = []
  const invalid: string[] = []
  for (const token of text.split(/[\s,]+/)) {
    if (!token) continue
    const handle = normalizeHandle(token)
    if (!handle) {
      invalid.push(token)
    } else if (!handles.includes(handle) && handles.length < max) {
      handles.push(handle)
    }
  }
  return { handles, invalid }
}

// Items not already present in `existing` (compared case-insensitively).
export function dedupe(items: readonly string[], existing: Iterable<string | null>): string[] {
  const seen = new Set<string>()
  for (const value of existing) {
    if (value) seen.add(value.toLowerCase())
  }
  return items.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
