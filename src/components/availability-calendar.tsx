'use client'

import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
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
  booked?: boolean
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function AvailabilityCalendar({
  events,
  selectedDate,
  onSelectDate,
  className,
}: {
  events: CalendarEvent[]
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
  className?: string
}) {
  return (
    <div className={cn('gs-calendar', className)}>
      <Calendar
        localizer={localizer}
        events={events}
        views={['month']}
        defaultView="month"
        style={{ height: 560 }}
        selectable
        popup
        onSelectSlot={(slotInfo) => onSelectDate?.(slotInfo.start)}
        onSelectEvent={(event) => onSelectDate?.(event.start)}
        eventPropGetter={(event) => ({
          className: cn(event.booked && 'gs-event-booked'),
        })}
        dayPropGetter={(date) => {
          if (selectedDate && isSameDay(date, selectedDate)) {
            return { className: 'rbc-selected-cell' }
          }
          return {}
        }}
      />
    </div>
  )
}
