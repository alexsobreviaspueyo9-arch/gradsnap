export function localDateToISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isoDateToLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

// `time` is a Postgres `time` value serialized as "HH:MM" or "HH:MM:SS".
// Parsed as local wall-clock time, same convention as isoDateToLocalDate.
export function slotDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}`)
}

// Slot date/start_time are wall-clock values with no zone. Keep in sync
// with the time zone used by book_slot() in supabase/schema.sql.
export const APP_TIME_ZONE = 'America/New_York'

// A slot is upcoming while its start time hasn't passed in APP_TIME_ZONE,
// regardless of the server's own zone (Vercel runs in UTC).
export function isUpcomingSlot(
  slot: { date: string; start_time: string },
  now: Date = new Date()
): boolean {
  // sv-SE formats as "YYYY-MM-DD HH:MM", which compares correctly as a string.
  const nowLocal = now.toLocaleString('sv-SE', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${slot.date} ${slot.start_time.slice(0, 5)}` > nowLocal
}

// startISO plus the same weekday for the following weeks (weeks >= 1).
// Built from calendar days, not milliseconds, so DST changes can't shift it.
export function weeklyDates(startISO: string, weeks: number): string[] {
  const start = isoDateToLocalDate(startISO)
  return Array.from({ length: weeks }, (_, i) =>
    localDateToISODate(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7)
    )
  )
}

export function todayISODate(): string {
  return localDateToISODate(new Date())
}

export function formatDateHeading(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function groupByDate<T extends { date: string }>(
  items: T[]
): [string, T[]][] {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const existing = grouped.get(item.date)
    if (existing) {
      existing.push(item)
    } else {
      grouped.set(item.date, [item])
    }
  }
  return Array.from(grouped.entries())
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - instant.getTime()
}

// The instant a slot starts: its date/time are APP_TIME_ZONE wall clock, so
// the result is right whatever zone the server or browser runs in (DST too).
export function zonedDateTime(date: string, time: string, timeZone: string = APP_TIME_ZONE): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  const first = wall - zoneOffsetMs(new Date(wall), timeZone)
  return new Date(wall - zoneOffsetMs(new Date(first), timeZone))
}

// "Sat, Dec 5, 10:00 AM" in the market's zone (same on server and browser).
export function formatZonedDateTime(instant: Date): string {
  return instant.toLocaleString('en-US', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
