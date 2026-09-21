'use client'

import posthog from 'posthog-js'

// Runs once, synchronously, the moment this module is first imported in the
// browser — before any component's useEffect could possibly fire. Doing
// init here (not inside a component's useEffect) avoids a real ordering
// risk: React runs a child's effects before its parent's, so a page-level
// "track landing_viewed on mount" component could otherwise call
// posthog.capture() before a parent PostHogProvider's own effect had
// called posthog.init().
if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (key && !posthog.__loaded) {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false, // this app tracks specific named events, not blanket pageviews
      person_profiles: 'identified_only',
    })
  }
}

// No-ops (does not throw) when NEXT_PUBLIC_POSTHOG_KEY isn't set yet, so
// every call site can fire events unconditionally without an env check.
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.capture(name, properties)
}

export { posthog }
