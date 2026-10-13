'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { WEEKDAYS, type Weekday, type WeeklyAvailability } from '@/types/database'

const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const DEFAULT_RANGE = { start: '09:00', end: '17:00' }

const TIME_INPUT =
  'h-11 rounded-lg border border-input bg-card px-3 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function WeeklyAvailabilityPicker({
  value,
  onChange,
}: {
  value: WeeklyAvailability
  onChange: (next: WeeklyAvailability) => void
}) {
  function toggleDay(day: Weekday, enabled: boolean) {
    const next = { ...value }
    if (enabled) {
      next[day] = next[day] ?? DEFAULT_RANGE
    } else {
      delete next[day]
    }
    onChange(next)
  }

  function updateTime(day: Weekday, field: 'start' | 'end', time: string) {
    const current = value[day]
    if (!current) return
    onChange({ ...value, [day]: { ...current, [field]: time } })
  }

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day) => {
        const range = value[day]
        const enabled = Boolean(range)
        return (
          <div
            key={day}
            className={cn(
              'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 transition-colors',
              enabled ? 'bg-accent/60' : 'bg-muted/40'
            )}
          >
            <label className="flex w-36 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium">
              <Checkbox
                checked={enabled}
                onCheckedChange={(checked) => toggleDay(day, checked === true)}
              />
              {DAY_LABELS[day]}
            </label>
            {range ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={range.start}
                  onChange={(e) => updateTime(day, 'start', e.target.value)}
                  className={TIME_INPUT}
                  aria-label={`${DAY_LABELS[day]} start time`}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="time"
                  value={range.end}
                  onChange={(e) => updateTime(day, 'end', e.target.value)}
                  className={TIME_INPUT}
                  aria-label={`${DAY_LABELS[day]} end time`}
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not usually available
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
