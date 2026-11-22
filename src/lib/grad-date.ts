// "When is your graduation?" travels as ?grad=YYYY-MM-DD. It only marks the
// day on the calendar (and offers a jump to it); the calendar always opens on
// today, and nothing is filtered by it.
import { isoDateToLocalDate } from '@/lib/date'

export const GRAD_PARAM = 'grad'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// A real calendar date, today or later; anything else is ignored.
export function parseGradParam(value: string | null | undefined, todayISO: string): string | null {
  if (!value || !DATE_RE.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const isReal = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  if (!isReal) return null
  return value >= todayISO ? value : null
}

// Where the calendar opens: always today (this week), never the grad date.
export function calendarAnchor(todayISO: string): Date {
  return isoDateToLocalDate(todayISO)
}

export function isPastDate(dateISO: string, todayISO: string): boolean {
  return dateISO < todayISO
}

export function findPhotographersHref(gradISO: string | null): string {
  return gradISO ? `/photographers?${GRAD_PARAM}=${gradISO}` : '/photographers'
}
