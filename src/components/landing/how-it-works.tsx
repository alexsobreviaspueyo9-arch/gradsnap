'use client'

import Image from 'next/image'
import { MotionConfig, motion, type Variants } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const
const STEP_STAGGER_S = 0.16

// The numbers are real: this is a sequence, and each step depends on the last.
const STEPS = [
  {
    title: 'Find your photographer',
    body: 'Filter by city, price, and style until one feels right.',
  },
  {
    title: 'Book your session',
    body: 'Pick an open slot from their real calendar and lock it in.',
  },
  {
    title: 'Receive your photos',
    body: 'Your photographer delivers, and the day is yours to keep.',
  },
] as const

const LIST_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STEP_STAGGER_S } },
}

const STEP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export function HowItWorks() {
  // reducedMotion="user" drops the slide for people who ask for less motion
  // without changing the server-rendered markup (no hydration mismatch).
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32"
      >
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            How it works
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Three moves between you and a graduation you will actually want to
            remember.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 md:items-stretch">
          <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-muted md:min-h-[440px]">
            <Image
              src="https://images.unsplash.com/photo-1619279302118-43033660826a?q=80&w=1400&auto=format&fit=crop"
              alt="A graduate in cap and gown jumping in the air"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <motion.ol
            variants={LIST_VARIANTS}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="flex flex-col justify-center divide-y divide-border rounded-3xl bg-card px-6 sm:px-9"
          >
            {STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                variants={STEP_VARIANTS}
                className="flex gap-5 py-7 sm:py-9"
              >
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-xl font-semibold sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 max-w-[36ch] text-base leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>
    </MotionConfig>
  )
}
