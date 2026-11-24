'use client'

import Link from 'next/link'
import { Camera, GraduationCap, type LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/landing/reveal'
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

// Two cards on a warm gradient panel: the pair reads as one choice, and style
// (not size) marks the more likely one.
const CHOICES: readonly Choice[] = [
  {
    role: 'client',
    icon: GraduationCap,
    title: 'I am looking for a photographer for my graduation',
    body: 'See open dates and book a session.',
    action: 'Find a Photographer',
    variant: 'default',
  },
  {
    role: 'photographer',
    icon: Camera,
    title: 'I am a photographer, I want to join',
    body: 'Set your availability and start getting booked.',
    action: 'Join as a Photographer',
    variant: 'secondary',
  },
]

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32">
      <Reveal className="overflow-hidden rounded-3xl border border-border gs-elev-2">
        <div className="gs-hero-mesh px-6 py-12 sm:px-10 md:px-14 md:py-16">
          <h2 className="max-w-2xl font-display text-4xl leading-[1.1] font-normal text-balance sm:text-5xl">
            Where do you fit in?
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {CHOICES.map(({ role, icon: Icon, title, body, action, variant }) => (
              <div
                key={role}
                className="gs-lift flex flex-col justify-between gap-10 rounded-2xl border border-border bg-card p-6 gs-elev-1 md:min-h-[280px] md:p-8"
              >
                <div>
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-6 max-w-[24ch] text-2xl leading-[1.2] font-medium text-balance">{title}</h3>
                  <p className="mt-3 text-base text-muted-foreground text-pretty">{body}</p>
                </div>
                <Link
                  href={role === 'client' ? '/photographers' : `/register?role=${role}`}
                  onClick={() => trackEvent('signup_started', { role })}
                  className={cn(buttonVariants({ variant, size: 'lg' }), 'h-11 self-start px-5 text-base')}
                >
                  {action}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
