export function todayISODate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
