'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatDateHeading, groupByDate } from '@/lib/date'
import {
  startDepositCheckout,
  bookSlotFree,
} from '@/app/dashboard/client/photographers/[id]/actions'
import type { AvailabilitySlot } from '@/types/database'

export function BookingWidget({
  photographerId,
  photographerName,
  basePrice,
  paymentsEnabled,
  initialSlots,
}: {
  photographerId: string
  photographerName: string
  basePrice: number | null
  paymentsEnabled: boolean
  initialSlots: AvailabilitySlot[]
}) {
  const [slots, setSlots] = useState(initialSlots)
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleBook(slotId: string) {
    if (paymentsEnabled && basePrice == null) return

    setBookingSlotId(slotId)
    setError(null)
    setSuccessMessage(null)

    try {
      if (paymentsEnabled && basePrice != null) {
        await startDepositCheckout({
          slotId,
          photographerId,
          photographerName,
          basePrice,
        })
      } else {
        await bookSlotFree(slotId)
        setSlots((prev) => prev.filter((s) => s.id !== slotId))
        setSuccessMessage(
          'Booking requested! The photographer will confirm shortly.'
        )
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
        setSlots((prev) => prev.filter((s) => s.id !== slotId))
      }
    } finally {
      setBookingSlotId(null)
    }
  }

  if (paymentsEnabled && basePrice == null) {
    return (
      <p className="text-sm text-muted-foreground">
        This photographer hasn&apos;t set a price yet, so booking isn&apos;t
        available.
      </p>
    )
  }

  const depositAmount =
    basePrice != null ? Math.round((basePrice / 2) * 100) / 100 : null

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open slots right now — check back later.
        </p>
      ) : (
        <div className="space-y-4">
          {paymentsEnabled && depositAmount != null && (
            <p className="text-sm text-muted-foreground">
              Booking requires a €{depositAmount.toFixed(2)} deposit (50%)
              paid up front; the rest is due after the session.
            </p>
          )}
          {groupByDate(slots).map(([date, dateSlots]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-base">
                  {formatDateHeading(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dateSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={bookingSlotId === slot.id}
                      onClick={() => handleBook(slot.id)}
                    >
                      {bookingSlotId === slot.id
                        ? paymentsEnabled
                          ? 'Redirecting…'
                          : 'Booking…'
                        : 'Book'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
