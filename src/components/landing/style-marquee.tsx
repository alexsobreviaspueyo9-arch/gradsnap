import { Aperture } from 'lucide-react'
import { PHOTOGRAPHER_SPECIALTIES } from '@/types/database'

const REPEATS = 3

function Row({ hidden = false }: { hidden?: boolean }) {
  const items = Array.from({ length: REPEATS }).flatMap(() =>
    PHOTOGRAPHER_SPECIALTIES.map((style) => style)
  )

  return (
    <ul
      aria-hidden={hidden || undefined}
      className={`flex shrink-0 items-center gap-8 pr-8 ${hidden ? 'gs-marquee-clone' : ''}`}
    >
      {items.map((style, i) => (
        <li key={`${style}-${i}`} className="flex items-center gap-8">
          <span className="font-heading text-3xl font-semibold tracking-tight whitespace-nowrap text-foreground/85 sm:text-4xl">
            {style}
          </span>
          <Aperture
            className="size-6 shrink-0 text-primary"
            strokeWidth={1.75}
            aria-hidden
          />
        </li>
      ))}
    </ul>
  )
}

export function StyleMarquee() {
  return (
    <section
      aria-label="Photography styles on GradSnap"
      className="gs-marquee overflow-hidden border-y border-border py-7"
    >
      <div className="gs-marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </section>
  )
}
