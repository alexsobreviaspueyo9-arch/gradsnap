import { Wordmark } from '@/components/brand/wordmark'
import { CalendarPreview } from '@/components/landing/calendar-preview'

// Split screen: the form on the page colour, the product beside it on wide
// screens (paper panel, Newsreader line, the calendar preview). No photo here:
// stand-in photos stay on the landing and empty states.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col px-4 py-6 sm:px-8">
        <header>
          <Wordmark />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      <aside
        aria-label="About GradSnap"
        className="hidden border-l border-border bg-[var(--paper)] lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-24"
      >
        <p className="max-w-[16ch] font-display text-5xl leading-[1.08] font-normal">
          Pick a day in Blacksburg and book your graduation photographer
        </p>
        <CalendarPreview className="mt-12 w-full max-w-[400px]" />
      </aside>
    </div>
  )
}
