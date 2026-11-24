import { Plus } from 'lucide-react'
import { Reveal } from '@/components/landing/reveal'

// Native <details> so the accordion is keyboard- and screen-reader-accessible
// with no JS. Answers state only what GradSnap actually does (no invented
// claims, numbers or guarantees).
const FAQ = [
  {
    q: 'How much does GradSnap cost?',
    a: 'During our launch pilot GradSnap is free. You pay your photographer directly, on the price they set.',
  },
  {
    q: 'Do I need an account to look?',
    a: 'No. You can browse photographers and their open dates as a guest. You only make an account when you book.',
  },
  {
    q: 'Who are the photographers?',
    a: 'Local photographers who shoot around Virginia Tech and Blacksburg. Each one sets their own prices, availability and cancellation terms.',
  },
  {
    q: 'How does booking work?',
    a: 'Pick an open slot on a photographer’s real calendar and send a request. They confirm it, and you can message them through GradSnap.',
  },
  {
    q: 'When should I book for graduation?',
    a: 'As early as you can. Graduation weekends fill up, so booking ahead gives you the most photographers and times to choose from.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
      <Reveal>
        <h2 className="font-display text-4xl leading-[1.1] font-normal text-balance sm:text-5xl">
          Questions, answered
        </h2>
      </Reveal>
      <div className="mt-10 divide-y divide-border border-y border-border">
        {FAQ.map((item, i) => (
          <Reveal key={item.q} delay={i * 0.05}>
            <details className="group py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[10px] py-4 text-left text-lg font-medium transition-colors hover:text-[color:var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ring)] [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  aria-hidden
                  strokeWidth={1.75}
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                />
              </summary>
              <p className="pb-4 text-base leading-relaxed text-muted-foreground text-pretty">{item.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
