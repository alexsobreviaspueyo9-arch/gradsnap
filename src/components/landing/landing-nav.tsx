import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#gallery', label: 'Gallery' },
] as const

// Quiet chrome: logo, the two section links, Log in as a text link and one
// button. The accent stays on "Get started" only.
export function LandingNav() {
  return (
    <header className="gs-glass gs-glass-bar sticky top-0 z-40">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Wordmark />
        <ul className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants(), 'h-9 px-4 text-sm')}>
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
