'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type HeadlineWord = { text: string; accent?: boolean }

const HEADLINE_LINES: readonly (readonly HeadlineWord[])[] = [
  [
    { text: 'Four' },
    { text: 'years,' },
    { text: 'one', accent: true },
    { text: 'day.', accent: true },
  ],
  [{ text: 'Make' }, { text: 'it' }, { text: 'unforgettable.' }],
]

const EASE = [0.16, 1, 0.3, 1] as const

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const word = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export function LandingHero() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const mainY = useTransform(scrollY, [0, 700], [0, reduce ? 0 : -48])
  const sideY = useTransform(scrollY, [0, 700], [0, reduce ? 0 : 56])

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_82%_25%,var(--brand-glow),transparent_70%)]"
      />

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-7xl items-center gap-10 px-4 pt-24 pb-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
        <div className="max-w-3xl">
          <motion.h1
            initial={reduce ? false : 'hidden'}
            animate="show"
            variants={container}
            className="font-heading text-[2.1rem] leading-[1] font-bold tracking-[-0.035em] sm:text-[3.5rem] lg:text-[3.25rem] xl:text-[4.25rem]"
          >
            {HEADLINE_LINES.map((line, li) => (
              <span key={li} className="block">
                {line.map((w, wi) => (
                  <motion.span
                    key={`${li}-${wi}`}
                    variants={word}
                    className={cn(
                      'mr-[0.22em] inline-block last:mr-0',
                      w.accent && 'text-primary'
                    )}
                  >
                    {w.text}
                  </motion.span>
                ))}
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6, ease: EASE }}
            className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            Book a real photographer for your graduation day, see live
            availability, and reserve your slot in minutes.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'group h-12 rounded-full px-7 text-base shadow-[0_10px_30px_-8px_var(--primary)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]'
              )}
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'lg' }),
                'h-12 rounded-full px-6 text-base'
              )}
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
          className="relative mx-auto h-[420px] w-full max-w-xl sm:h-[520px] lg:h-[min(640px,78dvh)] lg:max-w-none"
        >
          <motion.div
            style={{ y: mainY }}
            className="absolute top-0 right-0 h-[88%] w-[76%] overflow-hidden rounded-3xl shadow-[0_30px_80px_-20px_var(--shadow-tint)]"
          >
            <Image
              src="https://images.unsplash.com/photo-1570897234456-a6d0a709574f?q=80&w=1400&auto=format&fit=crop"
              alt="Graduates celebrating together outdoors"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 80vw"
              className="object-cover"
            />
          </motion.div>
          <motion.div
            style={{ y: sideY }}
            className="absolute bottom-0 left-0 h-[52%] w-[44%] overflow-hidden rounded-3xl shadow-[0_24px_60px_-16px_var(--shadow-tint)] ring-8 ring-background"
          >
            <Image
              src="https://images.unsplash.com/photo-1639765766830-d829d2fe4219?q=80&w=800&auto=format&fit=crop"
              alt="Graduate tossing their cap into the sky"
              fill
              sizes="(min-width: 1024px) 20vw, 40vw"
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
