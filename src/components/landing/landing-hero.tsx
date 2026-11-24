import Image from 'next/image'
import { PilotNote } from '@/components/brand/pilot-note'
import { FindPhotographersForm } from '@/components/landing/find-photographers-form'
import { CalendarPreview } from '@/components/landing/calendar-preview'
import { PLACEHOLDER_PHOTOS } from '@/lib/placeholder-photos'

const PHOTO = PLACEHOLDER_PHOTOS.burrussDrillfield

// Dynamic hero: a warm mesh ground, a staggered CSS entrance, and a layered
// visual (campus photo with the live-calendar card floating over it). Text
// never sits on the photograph. The entrance is CSS-only and disabled under
// reduced motion; the resting state is always visible (no JS-hidden content).
export function LandingHero() {
  return (
    <section className="gs-hero-mesh relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:py-20">
        <div className="min-w-0">
          <p className="gs-enter inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-sm text-muted-foreground gs-elev-1">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            For Virginia Tech seniors in Blacksburg, VA
          </p>
          <h1
            className="gs-enter mt-5 max-w-[16ch] font-display text-5xl leading-[1.03] font-normal text-balance sm:text-6xl xl:text-7xl"
            style={{ animationDelay: '0.06s' }}
          >
            Book your <span className="gs-grad-text">graduation</span> photographer in Blacksburg
          </h1>
          <p
            className="gs-enter mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground text-pretty"
            style={{ animationDelay: '0.12s' }}
          >
            See which photographers are free around your graduation and book a session in minutes.
          </p>
          <div className="gs-enter" style={{ animationDelay: '0.18s' }}>
            <FindPhotographersForm />
          </div>
          {process.env.PAYMENTS_ENABLED !== 'true' && (
            <div className="gs-enter" style={{ animationDelay: '0.24s' }}>
              <PilotNote className="mt-6" />
            </div>
          )}
        </div>

        <div className="gs-enter relative min-w-0 pb-24 sm:pb-16" style={{ animationDelay: '0.15s' }}>
          <figure className="gs-elev-3 relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted">
            <Image
              src={PHOTO.src}
              alt={PHOTO.alt}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </figure>
          <div className="absolute right-4 bottom-0 left-4 sm:right-auto sm:left-8 sm:w-[380px]">
            <CalendarPreview className="gs-elev-3" />
          </div>
        </div>
      </div>
    </section>
  )
}
