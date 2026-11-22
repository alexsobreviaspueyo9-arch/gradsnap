import Image from 'next/image'
import { PLACEHOLDER_PHOTOS } from '@/lib/placeholder-photos'

const PHOTO = PLACEHOLDER_PHOTOS.drillfieldLibrary

// The numbers are real: this is a sequence, and each step depends on the last.
const STEPS = [
  {
    title: 'Find your photographer',
    body: 'Filter by city, price and style until one feels right.',
  },
  {
    title: 'Book your session',
    body: 'Pick an open slot from their real calendar and lock it in.',
  },
  {
    title: 'Receive your photos',
    body: 'Your photographer delivers, and the day is yours to keep.',
  },
] as const

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
      <div className="max-w-xl">
        <h2 className="font-display text-4xl leading-[1.1] font-normal sm:text-5xl">How it works</h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          From picking a day to getting your photos, in three steps
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-16">
        <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={PHOTO.src}
            alt={PHOTO.alt}
            fill
            sizes="(min-width: 768px) 52vw, 100vw"
            className="object-cover"
          />
        </figure>
        <ol className="divide-y divide-border border-y border-border">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-6 py-8">
              <span aria-hidden className="w-6 shrink-0 font-display text-2xl leading-none text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl font-medium">{step.title}</h3>
                <p className="mt-2 max-w-[40ch] text-base leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
