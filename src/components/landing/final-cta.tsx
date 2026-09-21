'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Camera, GraduationCap } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

const EASE = [0.16, 1, 0.3, 1] as const

export function FinalCta() {
  const reduce = useReducedMotion()

  const reveal = (delay: number) =>
    ({
      initial: reduce ? false : { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.3 },
      transition: { duration: 0.7, delay, ease: EASE },
    }) as const

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 md:pb-32">
      <motion.h2
        {...reveal(0)}
        className="max-w-2xl font-heading text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl"
      >
        Where do you fit in?
      </motion.h2>

      <div className="mt-12 grid gap-4 md:grid-cols-[1.35fr_1fr]">
        <motion.div {...reveal(0.05)}>
          <Link
            href="/register?role=client"
            onClick={() => trackEvent('signup_started', { role: 'client' })}
            className="group relative flex h-full min-h-[320px] flex-col justify-between gap-10 overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground transition-transform duration-300 hover:-translate-y-1 active:scale-[0.99] md:min-h-[380px] md:p-10"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -bottom-24 size-96 rounded-full bg-[radial-gradient(closest-side,oklch(1_0_0/0.25),transparent)] transition-transform duration-700 group-hover:scale-125"
            />
            <div className="relative flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                <GraduationCap className="size-6" strokeWidth={1.75} />
              </span>
              <ArrowUpRight className="size-7 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div className="relative">
              <p className="max-w-[20ch] font-heading text-3xl leading-[1.1] font-semibold tracking-tight md:text-4xl">
                I am looking for a photographer for my graduation
              </p>
              <p className="mt-3 text-base opacity-85">
                Browse real availability and book a session today.
              </p>
            </div>
          </Link>
        </motion.div>

        <motion.div {...reveal(0.15)}>
          <Link
            href="/register?role=photographer"
            onClick={() => trackEvent('signup_started', { role: 'photographer' })}
            className="group relative flex h-full min-h-[320px] flex-col justify-between gap-10 overflow-hidden rounded-3xl bg-card p-8 text-card-foreground ring-1 ring-foreground/15 transition-all duration-300 hover:-translate-y-1 hover:ring-primary active:scale-[0.99] md:min-h-[380px] md:p-10"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
                <Camera className="size-6" strokeWidth={1.75} />
              </span>
              <ArrowUpRight className="size-7 text-primary transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>
            <div>
              <p className="max-w-[18ch] font-heading text-2xl leading-[1.15] font-semibold tracking-tight md:text-3xl">
                I am a photographer, I want to join
              </p>
              <p className="mt-3 text-base text-muted-foreground">
                Set your availability and start getting booked.
              </p>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
