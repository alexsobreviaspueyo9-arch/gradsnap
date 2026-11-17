import Link from 'next/link'
import { CANCELLATION_POLICY_PATH, FEES_PATH } from '@/lib/site'

const LINKS = [
  { href: '/login', label: 'Log in' },
  { href: '/photographers', label: 'Find a photographer' },
  { href: '/register?role=photographer', label: 'Join as a photographer' },
] as const

const PAYMENT_LINKS = [
  { href: FEES_PATH, label: 'Fees' },
  { href: CANCELLATION_POLICY_PATH, label: 'Cancellation policy' },
] as const

export function LandingFooter() {
  const links =
    process.env.PAYMENTS_ENABLED === 'true' ? [...LINKS, ...PAYMENT_LINKS] : LINKS
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} GradSnap. Real photographers for the day
          you finish school.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
