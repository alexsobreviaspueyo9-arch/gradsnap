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
