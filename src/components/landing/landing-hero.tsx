import Link from 'next/link'
import { PilotNote } from '@/components/brand/pilot-note'
import Image from 'next/image'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Type sits on the surface, never on the photograph: white text over this
// image measured as low as 1.5:1 against its sky. The photo keeps its own
// portrait shape so the caps in the air are never cropped.
export function LandingHero() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pt-28 sm:px-6 sm:pt-32 lg:min-h-[100dvh] lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-12">
      <div>
        <h1 className="text-[2.75rem] leading-[1.03] font-semibold tracking-[-0.035em] sm:text-6xl xl:text-7xl">
          <span className="block">Four years, one day.</span>
          <span className="block text-muted-foreground">
            Make it unforgettable.
          </span>
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
          Book a real photographer for your graduation day, see live
          availability, and reserve your slot in minutes.
        </p>
        {process.env.PAYMENTS_ENABLED !== 'true' && <PilotNote className="mt-6" />}
        <form action="/photographers" method="get" className="mt-8 max-w-md space-y-2">
          <label htmlFor="hero-graduation-date" className="block text-sm font-medium">
            When is your graduation?
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="hero-graduation-date"
              name="date"
              type="date"
              className="h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              className={cn(buttonVariants({ size: 'lg' }), 'h-12 shrink-0 px-7 text-base')}
            >
              Find photographers
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Leave it empty to{' '}
            <Link href="/photographers" className="font-medium text-foreground underline underline-offset-4">
              see everyone
            </Link>
            .
          </p>
        </form>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="#how-it-works"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'h-12 px-6 text-base'
            )}
          >
            See how it works
          </a>
        </div>
      </div>

      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted lg:max-h-[78dvh] lg:justify-self-end lg:w-full">
        <Image
          src="https://images.unsplash.com/photo-1570897234456-a6d0a709574f?q=80&w=1600&auto=format&fit=crop"
          alt="Graduates in white dresses throwing their caps into the air on a campus lawn"
          fill
          priority
          sizes="(min-width: 1024px) 42vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  )
}
