import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#gallery', label: 'Gallery' },
] as const

// The page's one glass surface: a floating bar that content scrolls beneath.
// Labels stay monochrome; only "Get Started" carries the accent.
export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Main navigation"
        className="gs-glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full py-2 pr-2 pl-4 shadow-[0_8px_30px_var(--shadow-tint)]"
      >
        <Wordmark />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex h-10 items-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'h-10 px-4 text-sm hover:bg-foreground/5'
            )}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants(), 'h-10 px-5 text-sm')}
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
