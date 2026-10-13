import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { GalleryStrip } from '@/components/landing/gallery-strip'
import { FinalCta } from '@/components/landing/final-cta'
import { LandingFooter } from '@/components/landing/landing-footer'
import { TrackLandingViewed } from '@/components/analytics/track-landing-viewed'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <TrackLandingViewed />
      <LandingNav />
      <main>
        <LandingHero />
        <HowItWorks />
        <GalleryStrip />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
