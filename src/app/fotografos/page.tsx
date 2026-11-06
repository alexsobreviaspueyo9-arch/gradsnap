import Link from 'next/link'
import type { Metadata } from 'next'
import { CalendarCheck, GraduationCap, HandCoins, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/brand/wordmark'
import { LandingFooter } from '@/components/landing/landing-footer'
import { TrackPhotographerLandingViewed } from '@/components/analytics/track-photographer-landing-viewed'
import { parseSignupSrc } from '@/lib/signup-src'

export const metadata: Metadata = {
  title: 'GradSnap for photographers',
  description:
    'Get booked by Virginia Tech graduates. Direct bookings, and no commission while we validate GradSnap.',
}

const BENEFITS: readonly { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: GraduationCap,
    title: 'Get seen by Virginia Tech graduates',
    body: 'Students looking for a graduation photographer find you with your prices, portfolio and open dates.',
  },
  {
    icon: CalendarCheck,
    title: 'Direct bookings',
    body: 'Clients book the slots you open, and they pay you directly, by Stripe or cash, your way.',
  },
  {
    icon: HandCoins,
    title: 'No commission while we validate',
    body: 'GradSnap takes 0% of your bookings during this validation phase.',
  },
]

export default async function PhotographersLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>
}) {
  const { src: rawSrc } = await searchParams
  const src = parseSignupSrc(rawSrc)
  const registerHref = `/register?role=photographer${src ? `&src=${src}` : ''}`

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <TrackPhotographerLandingViewed src={src} />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'h-9 px-4')}
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
        <h1 className="max-w-3xl text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-6xl">
          Photograph graduations.{' '}
          <span className="text-muted-foreground">Get booked directly.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          GradSnap connects graduation photographers with students who are
          ready to book. Set your prices and availability in a few minutes.
        </p>
        <Link
          href={registerHref}
          className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-12 px-7 text-base')}
        >
          Join as a photographer
        </Link>

        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-3xl bg-card p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-5 text-foreground" strokeWidth={1.75} />
              </span>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <LandingFooter />
    </div>
  )
}
