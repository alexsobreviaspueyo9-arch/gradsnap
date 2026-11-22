import Link from 'next/link'
import { CANCELLATION_POLICY_PATH, FEES_PATH } from '@/lib/site'
import { PhotographerPayFacts, PhotographerPenaltyTable } from '@/components/fees/fee-tables'
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

// Only while PAYMENTS_ENABLED=true; the numbers come from lib/fees.ts.
function HowYouGetPaid() {
  return (
    <section aria-labelledby="get-paid" className="mt-14 max-w-3xl space-y-4">
      <h2 id="get-paid" className="text-2xl font-medium">
        How you get paid
      </h2>
      <div className="rounded-2xl border border-border bg-card p-6">
        <PhotographerPayFacts />
      </div>
      <h3 className="text-lg font-medium">If you cancel</h3>
      <PhotographerPenaltyTable />
      <p className="rounded-xl border border-border bg-muted p-4 text-sm">
        <strong>Founding photographers:</strong> TODO, terms to be confirmed. No numbers yet.
      </p>
      <p className="text-sm text-muted-foreground">
        Details on{' '}
        <Link href={FEES_PATH} className="font-medium text-foreground underline underline-offset-4">
          fees
        </Link>{' '}
        and the{' '}
        <Link
          href={CANCELLATION_POLICY_PATH}
          className="font-medium text-foreground underline underline-offset-4"
        >
          cancellation policy
        </Link>
        .
      </p>
    </section>
  )
}

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

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
        <h1 className="max-w-3xl font-display text-5xl leading-[1.06] font-normal sm:text-6xl">
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

        <ul className="mt-16 grid gap-x-10 gap-y-8 border-t border-border pt-8 sm:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <h2 className="flex items-center gap-2.5 text-lg font-medium">
                <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                {title}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>

        {process.env.PAYMENTS_ENABLED === 'true' && <HowYouGetPaid />}
      </main>

      <LandingFooter />
    </div>
  )
}
