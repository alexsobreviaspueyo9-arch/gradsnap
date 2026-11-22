'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Check, CalendarX2 } from 'lucide-react'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { formatDateHeading, isoDateToLocalDate, localDateToISODate } from '@/lib/date'
import { useBookSlot } from '@/components/client/use-book-slot'
import { BookingConfirmation } from '@/components/client/booking-confirmation'
import { SlotPicker, slotTimeLabel } from '@/components/client/slot-picker'
import { BookButton } from '@/components/client/book-button'
import { FeeSummary } from '@/components/client/fee-summary'
import { PilotNote } from '@/components/brand/pilot-note'
import type { BookingViewer } from '@/lib/guest-booking'
import { bookingSteps, canContinue, firstOpenStep, type BookingStep } from '@/lib/booking-steps'
import { usePreviewMode } from '@/components/preview/preview-mode'
import { cn } from '@/lib/utils'
import type { PaymentSetup } from '@/lib/payment'
import type { AvailabilitySlot } from '@/types/database'

const PANEL = 'rounded-2xl border border-border bg-card p-5 sm:p-6'

export type PackageOption = {
  id: string
  name: string
  duration_minutes: number
  included_photos: number
  delivery_days: number
  price: number
}

const STEP_LABEL: Record<BookingStep, string> = {
  package: 'Package',
  time: 'Time',
  review: 'Review',
}

function ProgressBar({ steps, current }: { steps: BookingStep[]; current: BookingStep }) {
  const index = steps.indexOf(current)
  return (
    <ol aria-label="Booking steps" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
      {steps.map((step, i) => (
        <li key={step} aria-current={i === index ? 'step' : undefined} className="space-y-1.5">
          <span
            className={cn(
              'block h-1.5 rounded-full',
              i <= index ? 'bg-foreground' : 'bg-muted'
            )}
            aria-hidden
          />
          <span
            className={cn(
              'text-xs font-medium',
              i === index ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {i + 1}. {STEP_LABEL[step]}
          </span>
        </li>
      ))}
    </ol>
  )
}

function PackagePicker({
  packages,
  selectedId,
  onSelect,
}: {
  packages: PackageOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div role="radiogroup" aria-label="Packages" className="space-y-3">
      {packages.map((pkg) => {
        const isSelected = pkg.id === selectedId
        return (
          <button
            key={pkg.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(pkg.id)}
            className={cn(
              'flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-colors',
              isSelected ? 'border-primary bg-accent' : 'border-input hover:bg-muted'
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-semibold">
                {isSelected && <Check className="size-4 text-accent-foreground" aria-hidden />}
                {pkg.name}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {pkg.duration_minutes} min, {pkg.included_photos} edited photos, delivered in{' '}
                {pkg.delivery_days} day{pkg.delivery_days === 1 ? '' : 's'}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">${pkg.price}</span>
          </button>
        )
      })}
    </div>
  )
}

// Package -> time -> review. One primary button per step, kept in a sticky
// bar on phones. Choosing never books: only the review step's Book does.
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
  packages = [],
  viewer = 'client',
  initialDate = null,
  initialSlotId = null,
  initialPackageId = null,
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
  packages?: PackageOption[]
  viewer?: BookingViewer
  /** Preselected after a guest signs up (?date=&slot=&pkg=); never booked automatically. */
  initialDate?: string | null
  initialSlotId?: string | null
  initialPackageId?: string | null
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
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(preselected?.id ?? null)
  const [packageId, setPackageId] = useState<string | null>(
    () => packages.find((p) => p.id === initialPackageId)?.id ?? (packages.length === 1 ? packages[0].id : null)
  )
  const steps = bookingSteps(packages.length > 0)
  const [step, setStep] = useState<BookingStep>(() =>
    firstOpenStep(steps, { packageId, slotId: preselected?.id ?? null })
  )
  const { bookingSlotId, error, confirmation, clearConfirmation, bookSlot } =
    useBookSlot(paymentsEnabled)

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

  const selectedDateISO = selectedDate ? localDateToISODate(selectedDate) : null
  const daySlots = selectedDateISO ? slots.filter((s) => s.date === selectedDateISO) : []
  // Derived, so a slot someone else just booked can't stay selected.
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null
  const selectedPackage = packages.find((p) => p.id === packageId) ?? null
  const isBooking = bookingSlotId !== null
  const busyLabel = paymentsEnabled ? 'Redirecting…' : 'Booking…'
  const sessionPrice = selectedPackage?.price ?? basePrice
  const sessionPriceLabel = selectedPackage ? `$${selectedPackage.price}` : priceLabel
  const stepIndex = steps.indexOf(step)
  const selection = { packageId, slotId: selectedSlot?.id ?? null }

  function handleBook(slot: AvailabilitySlot) {
    bookSlot(
      {
        slotId: slot.id,
        packageId,
        photographerId,
        photographerName,
        basePrice: sessionPrice,
        summary: {
          photographerName,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          priceLabel: sessionPriceLabel,
          payment,
          paymentTerms,
          paymentLink,
          basePrice: paymentsEnabled ? sessionPrice : null,
        },
      },
      () => setSlots((prev) => prev.filter((s) => s.id !== slot.id))
    )
  }

  if (paymentsEnabled && sessionPrice == null) {
    return (
      <p className="text-sm text-muted-foreground">
        This photographer hasn&apos;t set a price yet, so booking isn&apos;t available.
      </p>
    )
  }

  if (confirmation) {
    return <BookingConfirmation booking={confirmation} onBookAnother={clearConfirmation} />
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CalendarX2 className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-sm text-muted-foreground">No open slots right now. Check back later.</p>
      </div>
    )
  }

  const primary =
    step === 'review' && selectedSlot ? (
      <BookButton
        viewer={viewer}
        photographerId={photographerId}
        slot={selectedSlot}
        isBooking={isBooking}
        busyLabel={busyLabel}
        onBook={() => handleBook(selectedSlot)}
        refCode={refCode}
        packageId={packageId}
      />
    ) : (
      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base"
        disabled={!canContinue(step, selection)}
        onClick={() => setStep(steps[stepIndex + 1])}
      >
        Continue
      </Button>
    )

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

      <div className={cn(PANEL, 'space-y-5')}>
        <ProgressBar steps={steps} current={step} />

        {step === 'package' && (
          <section aria-label="Choose a package" className="space-y-3">
            <h3 className="text-lg font-medium">Choose a package</h3>
            <PackagePicker packages={packages} selectedId={packageId} onSelect={setPackageId} />
          </section>
        )}

        {step === 'time' && (
          <section aria-label="Choose a time" className="space-y-4">
            <AvailabilityCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <h3 className="text-lg font-medium">
              {selectedDateISO ? formatDateHeading(selectedDateISO) : 'Select a date'}
            </h3>
            {daySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open slots this day. Pick a day marked Open on the calendar.
              </p>
            ) : (
              <SlotPicker
                label="Available times"
                slots={daySlots}
                selectedId={selectedSlot?.id ?? null}
                onSelect={setSelectedSlotId}
                disabled={isBooking}
              />
            )}
          </section>
        )}

        {step === 'review' && selectedSlot && (
          <section aria-label="Review your booking" className="space-y-4">
            <h3 className="text-lg font-medium">Review your booking</h3>
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Photographer</dt>
                <dd className="text-right font-medium">{photographerName}</dd>
              </div>
              {selectedPackage && (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">Package</dt>
                  <dd className="text-right font-medium">
                    {selectedPackage.name}, {selectedPackage.duration_minutes} min
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right font-medium">
                  {formatDateHeading(selectedSlot.date)}, {slotTimeLabel(selectedSlot)}{' '}
                  <span className="text-muted-foreground">(New York time)</span>
                </dd>
              </div>
              {sessionPriceLabel && (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="text-right font-medium">{sessionPriceLabel}</dd>
                </div>
              )}
            </dl>
            {paymentsEnabled && sessionPrice != null && (
              <FeeSummary basePrice={sessionPrice} date={selectedSlot.date} startTime={selectedSlot.start_time} />
            )}
          </section>
        )}

        <div className="sticky bottom-0 z-20 -mx-5 space-y-2 border-t border-border bg-card px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:py-0">
          {primary}
          {stepIndex > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full"
              onClick={() => setStep(steps[stepIndex - 1])}
            >
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
