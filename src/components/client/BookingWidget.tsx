'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarX2 } from 'lucide-react'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { formatDateHeading, isoDateToLocalDate, localDateToISODate } from '@/lib/date'
import { useBookSlot } from '@/components/client/use-book-slot'
import { BookingConfirmation } from '@/components/client/booking-confirmation'
import { SlotPicker } from '@/components/client/slot-picker'
import { BookButton } from '@/components/client/book-button'
import { FeeSummary } from '@/components/client/fee-summary'
import { PilotNote } from '@/components/brand/pilot-note'
import type { BookingViewer } from '@/lib/guest-booking'
import { usePreviewMode } from '@/components/preview/preview-mode'
import type { PaymentSetup } from '@/lib/payment'
import type { AvailabilitySlot } from '@/types/database'

const PANEL = 'rounded-3xl bg-card p-5 sm:p-6'

export function BookingWidget({
  photographerId,
  photographerName,
  basePrice,
  priceLabel,
  payment,
  paymentTerms,
  paymentsEnabled,
  paymentLink,
  initialSlots,
  viewer = 'client',
  initialDate = null,
  initialSlotId = null,
  refCode = null,
}: {
  photographerId: string
  photographerName: string
  basePrice: number | null
  priceLabel: string | null
  payment: PaymentSetup
  paymentTerms: string | null
  paymentsEnabled: boolean
  paymentLink: string | null
  initialSlots: AvailabilitySlot[]
  viewer?: BookingViewer
  /** Preselected after a guest signs up (?date=&slot=); never booked automatically. */
  initialDate?: string | null
  initialSlotId?: string | null
  refCode?: string | null
}) {
  const supabase = createClient()
  const isPreview = usePreviewMode()
  const [slots, setSlots] = useState(initialSlots)
  const preselected = initialSlots.find((s) => s.id === initialSlotId) ?? null
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    const date = preselected?.date ?? initialDate ?? initialSlots[0]?.date
    return date ? isoDateToLocalDate(date) : undefined
  })
  const { bookingSlotId, error, confirmation, clearConfirmation, bookSlot } =
    useBookSlot(paymentsEnabled)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(preselected?.id ?? null)

  // Live-remove a slot the moment it's booked or deleted, so this
  // photographer's calendar never shows a slot that's already gone.
  useEffect(() => {
    if (isPreview || viewer !== 'client') return
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
  }, [supabase, photographerId, isPreview, viewer])

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
          payment,
          paymentTerms,
          paymentLink,
          basePrice: paymentsEnabled ? basePrice : null,
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
  // Derived, so a slot someone else just booked can't stay selected.
  const selectedSlot = daySlots.find((s) => s.id === selectedSlotId) ?? null
  const isBooking = bookingSlotId !== null
  const busyLabel = paymentsEnabled ? 'Redirecting…' : 'Booking…'

  if (paymentsEnabled && basePrice == null) {
    return (
      <p className="text-sm text-muted-foreground">
        This photographer hasn&apos;t set a price yet, so booking isn&apos;t
        available.
      </p>
    )
  }

  if (confirmation) {
    return (
      <BookingConfirmation booking={confirmation} onBookAnother={clearConfirmation} />
    )
  }

  return (
    <div className="space-y-4">
      {!paymentsEnabled && <PilotNote />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {initialSlotId && !preselected && (
        <Alert>
          <AlertDescription>
            The time you picked is no longer available. Choose another one below.
          </AlertDescription>
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
          <div className={PANEL}>
            <AvailabilityCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          <div className={PANEL}>
            <h3 className="text-lg font-semibold tracking-tight">
              {selectedDateISO
                ? formatDateHeading(selectedDateISO)
                : 'Select a date'}
            </h3>
            {daySlots.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No open slots this day. Pick a day marked Open on the calendar.
              </p>
            ) : (
              <>
                <div className="mt-4">
                  <SlotPicker
                    label="Available times"
                    slots={daySlots}
                    selectedId={selectedSlot?.id ?? null}
                    onSelect={setSelectedSlotId}
                    disabled={isBooking}
                  />
                </div>
                {selectedSlot && paymentsEnabled && basePrice != null && (
                  <div className="mt-5">
                    <FeeSummary
                      basePrice={basePrice}
                      date={selectedSlot.date}
                      startTime={selectedSlot.start_time}
                    />
                  </div>
                )}
                {selectedSlot ? (
                  <BookButton
                    viewer={viewer}
                    photographerId={photographerId}
                    slot={selectedSlot}
                    isBooking={isBooking}
                    busyLabel={busyLabel}
                    onBook={() => handleBook(selectedSlot)}
                    className="mt-5"
                    refCode={refCode}
                  />
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Choose a time to book it.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
