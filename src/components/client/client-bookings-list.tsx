import Link from 'next/link'
import { CalendarClock, CalendarPlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateHeading, zonedDateTime } from '@/lib/date'
import { bookingTimeline, canReview, type TimelineKey } from '@/lib/booking-timeline'
import { ReviewForm } from '@/components/client/review-form'
import type { BookingStatus } from '@/types/database'

export type ClientBooking = {
  id: string
  status: BookingStatus
  date: string
  startTime: string
  endTime: string
  photographerName: string
  packageName: string | null
  deliveredAt: string | null
  review: { rating: number } | null
}

const STEP_LABEL: Record<TimelineKey, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  session: 'Session day',
  delivered: 'Photos delivered',
}

function Timeline({ booking }: { booking: ClientBooking }) {
  const { steps, cancelled } = bookingTimeline({
    status: booking.status,
    sessionStart: zonedDateTime(booking.date, booking.startTime),
    deliveredAt: booking.deliveredAt,
  })
  if (cancelled) {
    return <p className="text-sm font-medium text-muted-foreground">This booking was cancelled.</p>
  }
  return (
    <ol aria-label="Booking status" className="grid grid-cols-4 gap-2">
      {steps.map((step) => (
        <li key={step.key} aria-current={step.state === 'current' ? 'step' : undefined} className="space-y-1.5">
          <span
            aria-hidden
            className={cn(
              'block h-1.5 rounded-full',
              step.state === 'done' ? 'bg-success' : step.state === 'current' ? 'bg-foreground' : 'bg-muted'
            )}
          />
          <span
            className={cn(
              'block text-xs font-medium',
              step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {STEP_LABEL[step.key]}
            <span className="sr-only">
              {step.state === 'done' ? ' (done)' : step.state === 'current' ? ' (current)' : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function ClientBookingsList({
  bookings,
  calendarHref,
}: {
  bookings: ClientBooking[]
  /** null in the admin preview (no real file to download). */
  calendarHref: ((id: string) => string) | null
}) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center gs-elev-1">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CalendarClock className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-sm text-muted-foreground">No bookings yet. They show up here once you book.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {bookings.map((booking) => {
        const isUpcoming = zonedDateTime(booking.date, booking.startTime) > new Date()
        return (
          <li key={booking.id} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 gs-elev-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-medium">{booking.photographerName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateHeading(booking.date)}, {booking.startTime.slice(0, 5)}-{booking.endTime.slice(0, 5)}{' '}
                  (New York time){booking.packageName ? `, ${booking.packageName}` : ''}
                </p>
              </div>
              {calendarHref && isUpcoming && booking.status !== 'cancelled' && (
                <a
                  href={calendarHref(booking.id)}
                  className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 gap-1.5 px-4')}
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  Add to calendar
                </a>
              )}
            </div>
            <Timeline booking={booking} />
            {booking.review ? (
              <p className="text-sm text-muted-foreground">
                You rated this session {booking.review.rating} out of 5. Thank you.
              </p>
            ) : (
              canReview(booking.status, false) && (
                <ReviewForm bookingId={booking.id} photographerName={booking.photographerName} />
              )
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function FindMoreLink({ href }: { href: string }) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: 'secondary' }), 'h-11 px-5')}>
      Find a photographer
    </Link>
  )
}
