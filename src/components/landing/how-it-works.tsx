'use client'

import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Search, CalendarCheck, Image as GalleryIcon } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const
const STEP_STAGGER_S = 0.18

// The grid triggers once, then each step card follows the previous one.
const GRID_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STEP_STAGGER_S } },
}

const STEP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE },
  },
}

function IconChip({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'glass' | 'solid'
}) {
  const styles =
    tone === 'glass'
      ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md'
      : 'bg-primary text-primary-foreground'
  return (
    <span
      className={`flex size-11 items-center justify-center rounded-2xl ${styles}`}
    >
      {children}
    </span>
  )
}

export function HowItWorks() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 md:py-32"
    >
      <div className="max-w-xl">
        <h2 className="font-heading text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
          How it works
        </h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          Three moves between you and a graduation you will actually want to
          remember.
        </p>
      </div>

      <motion.div
        variants={GRID_VARIANTS}
        initial={reduceMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-14 grid gap-4 md:grid-cols-6 md:grid-rows-2"
      >
        <motion.article
          variants={STEP_VARIANTS}
          className="group relative flex min-h-[440px] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white md:col-span-3 md:row-span-2 md:min-h-[560px] md:p-9"
        >
          <Image
            src="https://images.unsplash.com/photo-1619279302118-43033660826a?q=80&w=1200&auto=format&fit=crop"
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          />
          <div className="relative">
            <IconChip tone="glass">
              <Search className="size-5" strokeWidth={2} />
            </IconChip>
            <h3 className="mt-5 font-heading text-3xl font-semibold tracking-tight">
              Find your photographer
            </h3>
            <p className="mt-2 max-w-[32ch] text-base leading-relaxed text-white/85">
              Filter by city, price, and style until one feels right.
            </p>
          </div>
        </motion.article>

        <motion.article
          variants={STEP_VARIANTS}
          className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:col-span-3 md:p-9"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[radial-gradient(closest-side,oklch(1_0_0/0.28),transparent)]"
          />
          <span className="relative flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
            <CalendarCheck className="size-5" strokeWidth={2} />
          </span>
          <div className="relative mt-8">
            <h3 className="font-heading text-3xl font-semibold tracking-tight">
              Book your session
            </h3>
            <p className="mt-2 max-w-[34ch] text-base leading-relaxed opacity-85">
              Pick an open slot from their real calendar and lock it in.
            </p>
          </div>
        </motion.article>

        <motion.article
          variants={STEP_VARIANTS}
          className="relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-3xl bg-accent p-7 text-accent-foreground ring-1 ring-foreground/5 md:col-span-3 md:p-9"
        >
          <IconChip tone="solid">
            <GalleryIcon className="size-5" strokeWidth={2} />
          </IconChip>
          <div className="mt-8">
            <h3 className="font-heading text-3xl font-semibold tracking-tight">
              Receive your photos
            </h3>
            <p className="mt-2 max-w-[34ch] text-base leading-relaxed text-muted-foreground">
              Your photographer delivers, and the day is yours to keep.
            </p>
          </div>
        </motion.article>
      </motion.div>
    </section>
  )
}
