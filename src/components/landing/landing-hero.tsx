import Image from 'next/image'
import { PilotNote } from '@/components/brand/pilot-note'
import { FindPhotographersForm } from '@/components/landing/find-photographers-form'
import { CalendarPreview } from '@/components/landing/calendar-preview'
import { PLACEHOLDER_PHOTOS } from '@/lib/placeholder-photos'

const PHOTO = PLACEHOLDER_PHOTOS.burrussDrillfield

// Asymmetric split: the promise and the one action on the left, the campus and
// a preview of the calendar on the right. Text never sits on the photograph.
export function LandingHero() {
  return (
    <section className="bg-[var(--paper)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16 lg:py-20">
        <div className="min-w-0">
          <h1 className="max-w-[17ch] font-display text-5xl leading-[1.04] font-normal sm:text-6xl xl:text-7xl">
            Book your graduation photographer in Blacksburg
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
            For Virginia Tech seniors and their families. See which photographers
            are free around your graduation and book a session in minutes.
          </p>
          <FindPhotographersForm />
          {process.env.PAYMENTS_ENABLED !== 'true' && <PilotNote className="mt-6" />}
        </div>

        <div className="relative min-w-0 pb-24 sm:pb-20">
          <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            <Image
              src={PHOTO.src}
              alt={PHOTO.alt}
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </figure>
          <CalendarPreview className="absolute right-4 bottom-0 left-4 sm:right-auto sm:left-8 sm:w-[400px]" />
        </div>
      </div>
    </section>
  )
}
