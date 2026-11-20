import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/brand/wordmark'
import { LandingFooter } from '@/components/landing/landing-footer'

// Chrome for public pages outside the dashboards (guest browsing). The page
// content owns the one primary action, so the bar stays secondary.
export function PublicShell({
  accountHref,
  children,
}: {
  /** A signed-in photographer gets a link back to their dashboard. */
  accountHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="gs-glass gs-glass-bar sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark href="/" />
          <Link
            href={accountHref ?? '/login'}
            className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5 text-sm')}
          >
            {accountHref ? 'Your dashboard' : 'Log in'}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <LandingFooter />
    </div>
  )
}
