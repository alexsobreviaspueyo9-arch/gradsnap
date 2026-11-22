import { cn } from '@/lib/utils'

// A picture of the product, drawn in code: one week of the client calendar
// with the graduation day sealed and the days that have open times dotted.
// Illustrative only (no photographers or counts are claimed).
const WEEK = [
  { day: 'Mon', date: 11, open: false },
  { day: 'Tue', date: 12, open: false },
  { day: 'Wed', date: 13, open: true },
  { day: 'Thu', date: 14, open: true },
  { day: 'Fri', date: 15, open: true, graduation: true },
  { day: 'Sat', date: 16, open: true },
  { day: 'Sun', date: 17, open: false },
] as const

const TIMES = ['9:00 AM', '11:30 AM', '4:30 PM'] as const

export function CalendarPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Preview of the GradSnap calendar: a week with your graduation day marked and open times listed"
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-[0_12px_32px_var(--shadow-tint)]',
        className
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">This week</p>
        <p className="text-xs text-muted-foreground">Open times dotted</p>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEK.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">{d.day}</span>
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full text-sm tabular-nums',
                'graduation' in d && d.graduation && 'gs-seal font-medium text-[var(--seal)]'
              )}
            >
              {d.date}
            </span>
            <span
              className={cn('size-1.5 rounded-full', d.open ? 'bg-success' : 'bg-transparent')}
            />
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-medium">
          Fri 15 <span className="font-normal text-[var(--seal)]">Your graduation</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <li
              key={t}
              className="rounded-lg border border-border px-3 py-1.5 text-sm tabular-nums text-foreground"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
