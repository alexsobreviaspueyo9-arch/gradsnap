'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDateHeading } from '@/lib/date'
import {
  confirmBooking,
  completeBooking,
  cancelBooking,
} from '@/app/dashboard/photographer/bookings/actions'
import type { Booking, AvailabilitySlot, BookingStatus } from '@/types/database'

export type BookingWithDetails = Booking & {
  slot: Pick<AvailabilitySlot, 'id' | 'date' | 'start_time' | 'end_time'>
  clientName: string
}

const STATUS_VARIANT = {
  pending: 'secondary',
  confirmed: 'default',
  completed: 'outline',
  cancelled: 'outline',
} as const

function paymentStatusLabel(booking: BookingWithDetails): string | null {
  if (booking.deposit_amount == null) return null
  if (booking.deposit_refunded_at) return 'Deposit refunded'
  if (booking.balance_paid_at) return 'Balance paid ✓'
  if (booking.deposit_paid_at) return 'Deposit paid ✓ · Balance pending'
  return null
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
      <p className="text-sm text-muted-foreground">
        No bookings yet — they&apos;ll show up here once a client books a slot.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {bookings.map((booking) => (
        <Card key={booking.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {formatDateHeading(booking.slot.date)}
              <span className="text-muted-foreground font-normal ml-2">
                {booking.slot.start_time.slice(0, 5)}–
                {booking.slot.end_time.slice(0, 5)}
              </span>
            </CardTitle>
            <CardAction>
              <Badge variant={STATUS_VARIANT[booking.status]}>
                {booking.status}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Client: </span>
                {booking.clientName}
              </p>
              {paymentStatusLabel(booking) && (
                <p className="text-muted-foreground">
                  {paymentStatusLabel(booking)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {booking.status === 'pending' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={actingId === booking.id}
                  onClick={() => handleConfirm(booking)}
                >
                  {actingId === booking.id ? 'Confirming…' : 'Confirm'}
                </Button>
              )}
              {booking.status === 'confirmed' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={actingId === booking.id}
                  onClick={() => handleComplete(booking)}
                >
                  {actingId === booking.id ? 'Completing…' : 'Mark completed'}
                </Button>
              )}
              {(booking.status === 'pending' ||
                booking.status === 'confirmed') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={actingId === booking.id}
                  onClick={() => handleCancel(booking)}
                >
                  {actingId === booking.id ? 'Cancelling…' : 'Cancel'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
