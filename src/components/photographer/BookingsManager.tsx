'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarClock, MessageCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { formatDateHeading, isoDateToLocalDate } from '@/lib/date'
import {
  confirmBooking,
  completeBooking,
  cancelBooking,
  setBookingPaymentStatus,
} from '@/app/dashboard/photographer/bookings/actions'
import type {
  Booking,
  AvailabilitySlot,
  BookingStatus,
  PaymentStatus,
} from '@/types/database'

export type BookingWithDetails = Booking & {
  slot: Pick<AvailabilitySlot, 'id' | 'date' | 'start_time' | 'end_time'>
  clientName: string
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-warning-fill text-warning',
  confirmed: 'bg-success-fill text-success',
  completed: 'bg-muted text-foreground',
  cancelled: 'bg-muted text-muted-foreground',
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  paid: 'bg-success-fill text-success',
}

function paymentStatusLabel(booking: BookingWithDetails): string | null {
  if (booking.deposit_amount == null) return null
  if (booking.deposit_refunded_at) return 'Deposit refunded'
  if (booking.balance_paid_at) return 'Balance paid'
  if (booking.deposit_paid_at) return 'Deposit paid, balance pending'
  return null
}

function DateTile({ isoDate, muted }: { isoDate: string; muted: boolean }) {
  const date = isoDateToLocalDate(isoDate)
  return (
    <div
      className={cn(
        'flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl',
        muted ? 'bg-muted text-muted-foreground' : 'bg-muted text-foreground'
      )}
    >
      <span className="text-[0.6875rem] font-semibold tracking-wide uppercase">
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span className="text-2xl leading-none font-bold tabular-nums">
        {date.getDate()}
      </span>
    </div>
  )
}

export function BookingsManager({
  initialBookings,
}: {
  initialBookings: BookingWithDetails[]
}) {
  const [bookings, setBookings] = useState(initialBookings)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  function patchStatus(bookingId: string, status: BookingStatus) {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    )
  }

  function patchPaymentStatus(bookingId: string, paymentStatus: PaymentStatus) {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, payment_status: paymentStatus } : b
      )
    )
  }

  async function handleTogglePaymentStatus(booking: BookingWithDetails) {
    const next: PaymentStatus =
      booking.payment_status === 'paid' ? 'pending' : 'paid'

    setActingId(booking.id)
    setError(null)

    try {
      await setBookingPaymentStatus(booking.id, next)
      patchPaymentStatus(booking.id, next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setActingId(null)
    }
  }

  async function handleConfirm(booking: BookingWithDetails) {
    setActingId(booking.id)
    setError(null)

    try {
      await confirmBooking(booking.id)
      patchStatus(booking.id, 'confirmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setActingId(null)
    }
  }

  async function handleComplete(booking: BookingWithDetails) {
    setActingId(booking.id)
    setError(null)

    try {
      await completeBooking(booking.id)
      patchStatus(booking.id, 'completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setActingId(null)
    }
  }

  async function handleCancel(booking: BookingWithDetails) {
    if (!window.confirm('Cancel this booking?')) return

    setActingId(booking.id)
    setError(null)

    try {
      await cancelBooking(booking.id)
      patchStatus(booking.id, 'cancelled')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setActingId(null)
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CalendarClock className="size-7" strokeWidth={1.75} />
        </span>
        <p className="text-xl font-semibold">No bookings yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          They will show up here as soon as a client books one of your open
          slots.
        </p>
      </div>
    )
  }

  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pendingCount > 0 && (
        <p className="text-sm font-medium text-muted-foreground">
          {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}{' '}
          waiting for you
        </p>
      )}

      {bookings.map((booking) => {
        const busy = actingId === booking.id
        const inactive =
          booking.status === 'cancelled' || booking.status === 'completed'
        const paymentNote = paymentStatusLabel(booking)
        return (
          <article
            key={booking.id}
            className={cn(
              'flex flex-col gap-5 rounded-3xl bg-card p-5 sm:flex-row sm:items-center sm:p-6',
              inactive && 'bg-muted/50'
            )}
          >
            <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
              <DateTile isoDate={booking.slot.date} muted={inactive} />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">
                  {booking.clientName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateHeading(booking.slot.date)}
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {booking.slot.start_time.slice(0, 5)} -{' '}
                  {booking.slot.end_time.slice(0, 5)}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn(STATUS_STYLES[booking.status], 'capitalize')}>
                  {booking.status}
                </Badge>
                <Badge className={cn(PAYMENT_STATUS_STYLES[booking.payment_status])}>
                  {booking.payment_status === 'paid' ? 'Paid' : 'Payment pending'}
                </Badge>
                {paymentNote && (
                  <span className="text-xs text-muted-foreground">
                    {paymentNote}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {booking.status === 'pending' && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-4"
                    disabled={busy}
                    onClick={() => handleConfirm(booking)}
                  >
                    {busy ? 'Confirming…' : 'Confirm'}
                  </Button>
                )}
                {booking.status === 'confirmed' && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-4"
                    disabled={busy}
                    onClick={() => handleComplete(booking)}
                  >
                    {busy ? 'Completing…' : 'Mark completed'}
                  </Button>
                )}
                {(booking.status === 'confirmed' ||
                  booking.status === 'completed') && (
                  <Link
                    href={`/dashboard/photographer/messages?booking=${booking.id}`}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'h-9 px-4'
                    )}
                  >
                    <MessageCircle className="size-4" />
                    Message
                  </Link>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-4"
                  disabled={busy}
                  onClick={() => handleTogglePaymentStatus(booking)}
                >
                  {booking.payment_status === 'paid'
                    ? 'Mark unpaid'
                    : 'Mark as paid'}
                </Button>
                {(booking.status === 'pending' ||
                  booking.status === 'confirmed') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 text-destructive hover:bg-destructive/10"
                    disabled={busy}
                    onClick={() => handleCancel(booking)}
                  >
                    {busy ? 'Cancelling…' : 'Cancel'}
                  </Button>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
