'use client'

import Link from 'next/link'
import { Camera, GraduationCap, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/posthog'
import type { UserRole } from '@/types/database'

type Choice = {
  role: UserRole
  icon: LucideIcon
  title: string
  body: string
  action: string
  variant: 'default' | 'secondary'
}

// Two equal cards: the pair reads as one choice, and style (not size) marks
// the more likely one.
const CHOICES: readonly Choice[] = [
  {
    role: 'client',
    icon: GraduationCap,
    title: 'I am looking for a photographer for my graduation',
    body: 'See open dates and book a session.',
    action: 'Find a photographer',
    variant: 'default',
  },
  {
    role: 'photographer',
    icon: Camera,
    title: 'I am a photographer, I want to join',
    body: 'Set your availability and start getting booked.',
    action: 'Join as a photographer',
    variant: 'secondary',
  },
]

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32">
      <h2 className="max-w-2xl font-display text-4xl leading-[1.1] font-normal sm:text-5xl">
        Where do you fit in?
      </h2>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {CHOICES.map(({ role, icon: Icon, title, body, action, variant }) => (
          <div
            key={role}
            className="flex flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-6 md:min-h-[280px] md:p-8"
          >
            <div>
              <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-6 max-w-[24ch] text-2xl leading-[1.2] font-medium">
                {title}
              </h3>
              <p className="mt-3 text-base text-muted-foreground">{body}</p>
            </div>
            <Link
              href={role === 'client' ? '/photographers' : `/register?role=${role}`}
              onClick={() => trackEvent('signup_started', { role })}
              className={cn(
                buttonVariants({ variant, size: 'lg' }),
                'h-11 self-start px-5 text-base'
              )}
            >
              {action}
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
