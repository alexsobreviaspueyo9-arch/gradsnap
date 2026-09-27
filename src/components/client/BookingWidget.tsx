'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarX2 } from 'lucide-react'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { formatDateHeading, isoDateToLocalDate, localDateToISODate } from '@/lib/date'
import { useBookSlot } from '@/components/client/use-book-slot'
import { BookingConfirmation } from '@/components/client/booking-confirmation'
import type { AvailabilitySlot, DepositPolicy } from '@/types/database'

const PANEL = 'rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6'

export function BookingWidget({
  photographerId,
  photographerName,
  basePrice,
  priceLabel,
  depositPolicy,
  paymentTerms,
  paymentsEnabled,
  paymentLink,
  initialSlots,
}: {
  photographerId: string
  photographerName: string
  basePrice: number | null
  priceLabel: string | null
  depositPolicy: DepositPolicy | null
  paymentTerms: string | null
  paymentsEnabled: boolean
  paymentLink: string | null
  initialSlots: AvailabilitySlot[]
}) {
  const supabase = createClient()
  const [slots, setSlots] = useState(initialSlots)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    initialSlots.length > 0 ? isoDateToLocalDate(initialSlots[0].date) : undefined
  )
  const { bookingSlotId, error, confirmation, clearConfirmation, bookSlot } =
    useBookSlot(paymentsEnabled)

  // Live-remove a slot the moment it's booked or deleted, so this
  // photographer's calendar never shows a slot that's already gone.
  useEffect(() => {
    const channel = supabase
      .channel(`photographer-availability-${photographerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_slots',
          filter: `photographer_id=eq.${photographerId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string }).id
            setSlots((prev) => prev.filter((s) => s.id !== oldId))
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AvailabilitySlot
            if (updated.is_booked) {
              setSlots((prev) => prev.filter((s) => s.id !== updated.id))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, photographerId])

  function handleBook(slot: AvailabilitySlot) {
    bookSlot(
      {
        slotId: slot.id,
        photographerId,
        photographerName,
        basePrice,
        summary: {
          photographerName,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          priceLabel,
          depositPolicy,
          paymentTerms,
          paymentLink,
        },
      },
      () => setSlots((prev) => prev.filter((s) => s.id !== slot.id))
    )
  }

  const events: CalendarEvent[] = useMemo(
    () =>
      [...new Set(slots.map((s) => s.date))].map((date) => ({
        id: date,
        title: 'Open',
        start: isoDateToLocalDate(date),
        end: isoDateToLocalDate(date),
      })),
    [slots]
  )

  const selectedDateISO = selectedDate
    ? localDateToISODate(selectedDate)
    : null
  const daySlots = selectedDateISO
    ? slots.filter((s) => s.date === selectedDateISO)
    : []

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

  if (confirmation) {
    return (
      <BookingConfirmation booking={confirmation} onBookAnother={clearConfirmation} />
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CalendarX2 className="size-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted-foreground">
            No open slots right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentsEnabled && depositAmount != null && (
            <p className="text-sm text-muted-foreground">
              Booking requires a €{depositAmount.toFixed(2)} deposit (50%)
              paid up front; the rest is due after the session.
            </p>
          )}

          <div className={PANEL}>
            <AvailabilityCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <div className={PANEL}>
            <h3 className="font-heading text-lg font-semibold tracking-tight">
              {selectedDateISO
                ? formatDateHeading(selectedDateISO)
                : 'Select a date'}
            </h3>
            <div className="mt-4 space-y-2">
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open slots this day. Pick a highlighted date on the
                  calendar.
                </p>
              ) : (
                daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2.5"
                  >
                    <span className="text-sm font-medium tabular-nums">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-5"
                      disabled={bookingSlotId === slot.id}
                      onClick={() => handleBook(slot)}
                    >
                      {bookingSlotId === slot.id
                        ? paymentsEnabled
                          ? 'Redirecting…'
                          : 'Booking…'
                        : 'Book'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
