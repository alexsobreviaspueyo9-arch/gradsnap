import Link from 'next/link'
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
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className={cn(buttonVariants({ size: 'lg' }), 'h-12 px-7 text-base')}
          >
            Get started
          </Link>
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
