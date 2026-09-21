'use client'

import { useRef } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { UserPlus, Search, CalendarCheck, MapPin, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconChip } from '@/components/icon-chip'

const STEPS = [
  {
    icon: UserPlus,
    title: 'Create your account',
    description: 'Sign up as a client in seconds — free, no commitment.',
  },
  {
    icon: Search,
    title: 'Find photographers near you',
    description: 'Filter by city and budget to find photographers that fit.',
  },
  {
    icon: CalendarCheck,
    title: 'Book your session',
    description: 'Pick an open slot and reserve it instantly.',
  },
] as const

function useStepOpacity(
  progress: MotionValue<number>,
  index: number,
  total: number,
  fadeWidth = 0.06
) {
  const L = index / total
  const U = (index + 1) / total
  const first = index === 0
  const last = index === total - 1

  const input = first
    ? [0, U - fadeWidth, U]
    : last
      ? [L, L + fadeWidth, 1]
      : [L, L + fadeWidth, U - fadeWidth, U]

  const output = first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]

  return useTransform(progress, input, output)
}

function StepLayer({
  progress,
  index,
  total,
  children,
}: {
  progress: MotionValue<number>
  index: number
  total: number
  children: React.ReactNode
}) {
  const opacity = useStepOpacity(progress, index, total)
  const y = useTransform(opacity, (v) => (1 - v) * 16)
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-0">
      {children}
    </motion.div>
  )
}

function SignupMockup() {
  return (
    <Card className="pointer-events-none w-full max-w-sm mx-auto shadow-lg">
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium mb-1">Create your account</p>
        <Input placeholder="Full name" readOnly value="Alex Sobrevias" />
        <Input placeholder="Email" readOnly value="alex@example.com" />
        <Button className="w-full" tabIndex={-1}>
          Sign up
        </Button>
      </CardContent>
    </Card>
  )
}

function SearchMockup() {
  return (
    <Card className="pointer-events-none w-full max-w-sm mx-auto shadow-lg">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          Barcelona
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget</span>
          <span className="font-medium">€50 – €200</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 w-2/3 rounded-full bg-primary" />
        </div>
        {[
          { name: 'Alex Sobrevias', price: '€120' },
          { name: 'Maria López', price: '€90' },
        ].map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10" />
              <span className="text-sm">{p.name}</span>
            </div>
            <Badge variant="secondary">{p.price}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function BookingMockup() {
  return (
    <Card className="pointer-events-none w-full max-w-sm mx-auto shadow-lg">
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium mb-1">Thursday, July 30</p>
        {['10:00–11:00', '11:30–12:30', '14:00–15:00'].map((slot, i) => (
          <div
            key={slot}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              i === 1 ? 'border-primary bg-primary/5' : ''
            }`}
          >
            {slot}
            {i === 1 ? (
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                <Check className="h-4 w-4" /> Booked
              </span>
            ) : (
              <Button size="sm" variant="outline" tabIndex={-1}>
                Book
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const MOCKUPS = [SignupMockup, SearchMockup, BookingMockup]

export function ScrollBookingDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <section ref={containerRef} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden border-t">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-16 px-4 md:grid-cols-2">
          <div className="relative h-56">
            {STEPS.map((step, i) => (
              <StepLayer
                key={step.title}
                progress={scrollYProgress}
                index={i}
                total={STEPS.length}
              >
                <IconChip
                  icon={step.icon}
                  className="h-12 w-12 mb-5"
                  iconClassName="h-6 w-6"
                />
                <h3 className="text-2xl sm:text-3xl font-bold mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {step.description}
                </p>
              </StepLayer>
            ))}
          </div>
          <div className="relative h-96">
            {MOCKUPS.map((Mockup, i) => (
              <StepLayer
                key={i}
                progress={scrollYProgress}
                index={i}
                total={STEPS.length}
              >
                <div className="flex h-full items-center">
                  <Mockup />
                </div>
              </StepLayer>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
