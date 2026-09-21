'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'

export function TrackLandingViewed() {
  useEffect(() => {
    trackEvent('landing_viewed')
  }, [])

  return null
}
