'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/posthog'
import type { SignupSrc } from '@/types/database'

export function TrackPhotographerLandingViewed({ src }: { src: SignupSrc | null }) {
  useEffect(() => {
    trackEvent('photographer_landing_viewed', { src })
  }, [src])

  return null
}
