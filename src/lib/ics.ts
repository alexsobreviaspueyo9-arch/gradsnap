// Minimal iCalendar (RFC 5545) builder for "Add to calendar" downloads and
// the photographer feed. Times are written in UTC (Z), so every calendar app
// shows them in the viewer's own zone correctly.

export type IcsEvent = {
  uid: string
  start: Date
  end: Date
  summary: string
  description?: string | null
  url?: string | null
}

const MAX_LINE = 74

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// Text values escape backslash, semicolon, comma and newlines.
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Lines longer than 75 octets are folded with CRLF + space.
function fold(line: string): string {
  if (line.length <= MAX_LINE) return line
  const parts: string[] = []
  for (let i = 0; i < line.length; i += MAX_LINE) parts.push(line.slice(i, i + MAX_LINE))
  return parts.join('\r\n ')
}

function eventLines(event: IcsEvent, stamp: Date): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(stamp)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    'END:VEVENT',
  ]
}

export function buildIcs(
  events: IcsEvent[],
  options: { name?: string; stamp?: Date } = {}
): string {
  const stamp = options.stamp ?? new Date()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GradSnap//Bookings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(options.name ? [`X-WR-CALNAME:${escapeIcsText(options.name)}`] : []),
    ...events.flatMap((event) => eventLines(event, stamp)),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
