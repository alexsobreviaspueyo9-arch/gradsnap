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
    body: 'Browse real availability and book a session today.',
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
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 md:pb-32">
      <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
        Where do you fit in?
      </h2>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {CHOICES.map(({ role, icon: Icon, title, body, action, variant }) => (
          <div
            key={role}
            className="flex flex-col justify-between gap-10 rounded-3xl bg-card p-8 md:min-h-[320px] md:p-10"
          >
            <div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-6" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-6 max-w-[22ch] text-2xl leading-[1.15] font-semibold md:text-3xl">
                {title}
              </h3>
              <p className="mt-3 text-base text-muted-foreground">{body}</p>
            </div>
            <Link
              href={`/register?role=${role}`}
              onClick={() => trackEvent('signup_started', { role })}
              className={cn(
                buttonVariants({ variant, size: 'lg' }),
                'h-12 self-start px-6 text-base'
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
