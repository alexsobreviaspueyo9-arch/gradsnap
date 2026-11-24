import { Search, CalendarCheck, Images, type LucideIcon } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'

// The numbers are real: this is a sequence, and each step depends on the last.
const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Search, title: 'Find your photographer', body: 'Filter by city, price and style until one feels right.' },
  { icon: CalendarCheck, title: 'Book your session', body: 'Pick an open slot from their real calendar and lock it in.' },
  { icon: Images, title: 'Receive your photos', body: 'Your photographer delivers, and the day is yours to keep.' },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
      <Reveal className="max-w-xl">
        <h2 className="font-display text-4xl leading-[1.1] font-normal text-balance sm:text-5xl">
          How it works
        </h2>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
          From picking a day to getting your photos, in three steps.
        </p>
      </Reveal>

      <ol className="mt-14 grid gap-5 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 0.1}>
            <div className="gs-lift h-full rounded-2xl border border-border bg-card p-7 gs-elev-1">
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-xl border border-border bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                >
                  <step.icon className="size-5" strokeWidth={1.75} />
                </span>
                <span aria-hidden className="font-display text-3xl leading-none text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-medium">{step.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground text-pretty">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
