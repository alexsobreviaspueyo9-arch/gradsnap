import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#gallery', label: 'Gallery' },
] as const

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-background/75 py-2 pr-2 pl-4 shadow-[0_8px_30px_var(--shadow-tint)] ring-1 ring-foreground/10 backdrop-blur-xl"
      >
        <Wordmark />

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              'h-10 rounded-full px-4 text-sm'
            )}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants(), 'h-10 rounded-full px-5 text-sm')}
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
