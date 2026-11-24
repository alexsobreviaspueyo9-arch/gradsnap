'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#faq', label: 'FAQ' },
] as const

// Quiet by default, then a solid blurred bar once the hero scrolls past. The
// sentinel + IntersectionObserver avoids scroll-position reads in render
// (Web Interface Guidelines: no layout reads on the hot path).
export function LandingNav() {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="absolute top-0 h-px w-px" />
      <header
        className={cn(
          'sticky top-0 z-40 transition-colors duration-300',
          scrolled
            ? 'border-b border-border bg-[color:var(--glass-fill)]/85 supports-[backdrop-filter]:backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <Wordmark />
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center rounded-[10px] px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden min-h-11 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:flex"
            >
              Log in
            </Link>
            <Link href="/register" className={cn(buttonVariants(), 'h-10 px-4 text-sm')}>
              Get Started
            </Link>
          </div>
        </nav>
      </header>
    </>
  )
}
