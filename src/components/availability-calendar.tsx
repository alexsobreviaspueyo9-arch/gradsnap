'use client'

import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './availability-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
})

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
}

export type CalendarView = 'month' | 'week'

const HIGHLIGHT_EVENT_ID = 'gs-highlight'

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Month grid by default. Callers can add a week view, control the shown date,
// mark one day (e.g. "Your graduation") and block days before `minDate`.
export function AvailabilityCalendar({
  events,
  selectedDate,
  onSelectDate,
  className,
  views = ['month'],
  view,
  onView,
  date,
  onNavigate,
  highlight = null,
  minDate,
}: {
  events: CalendarEvent[]
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
  className?: string
  views?: CalendarView[]
  view?: CalendarView
  onView?: (view: CalendarView) => void
  date?: Date
  onNavigate?: (date: Date) => void
  highlight?: { date: Date; label: string } | null
  minDate?: Date
}) {
  const allEvents = highlight
    ? [
        ...events,
        {
          id: HIGHLIGHT_EVENT_ID,
          title: highlight.label,
          start: highlight.date,
          end: highlight.date,
          allDay: true,
        },
      ]
    : events
  const isBlocked = (day: Date) => (minDate ? startOfDay(day) < startOfDay(minDate) : false)
  const select = (day: Date) => {
    if (!isBlocked(day)) onSelectDate?.(day)
  }

  return (
    <div className={cn('gs-calendar', view === 'week' && 'gs-calendar--days', className)}>
      <Calendar
        localizer={localizer}
        events={allEvents}
        views={views}
        defaultView={views[0]}
        {...(view ? { view, onView: (v: View) => onView?.(v as CalendarView) } : {})}
        {...(date ? { date, onNavigate: (d: Date) => onNavigate?.(d) } : {})}
        style={{ height: view === 'week' ? 260 : 560 }}
        selectable
        popup
        onSelectSlot={(slotInfo) => select(slotInfo.start)}
        onSelectEvent={(event) => select(event.start)}
        eventPropGetter={(event) =>
          event.id === HIGHLIGHT_EVENT_ID ? { className: 'gs-highlight-event' } : {}
        }
        dayPropGetter={(day) => {
          const classes = [
            selectedDate && isSameDay(day, selectedDate) ? 'rbc-selected-cell' : '',
            highlight && isSameDay(day, highlight.date) ? 'gs-highlight-day' : '',
            isBlocked(day) ? 'gs-past-day' : '',
          ].filter(Boolean)
          return classes.length ? { className: classes.join(' ') } : {}
        }}
      />
    </div>
  )
}
