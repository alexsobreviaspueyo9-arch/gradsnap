'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type NavItem = { href: string; label: string; exact?: boolean }

export function DashboardNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Dashboard"
      className="gs-scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
