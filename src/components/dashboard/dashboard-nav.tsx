'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type NavItem = { href: string; label: string; exact?: boolean }

// A segmented control: one track, the current section raised. Monochrome on
// purpose, so the accent stays free for each screen's primary action.
// `tall` gives 44px segments (admin chrome); dashboards keep 36px.
export function DashboardNav({
  items,
  label = 'Dashboard',
  tall = false,
  className,
}: {
  items: readonly NavItem[]
  label?: string
  tall?: boolean
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className={cn('gs-scrollbar-none -mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0', className)}
    >
      <ul className="inline-flex gap-1 rounded-full bg-foreground/[0.06] p-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                  tall ? 'h-11' : 'h-9',
                  active
                    ? 'bg-card text-foreground shadow-[0_1px_3px_var(--shadow-tint)]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
