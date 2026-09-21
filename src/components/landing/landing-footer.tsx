import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Real photographers for the day you finish school.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium"
        >
          <Link
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/register?role=client"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Find a photographer
          </Link>
          <Link
            href="/register?role=photographer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Join as a photographer
          </Link>
        </nav>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GradSnap. All rights reserved.
      </div>
    </footer>
  )
}
