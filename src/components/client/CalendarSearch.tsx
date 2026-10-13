'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Aperture, CalendarX2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  formatDateHeading,
  isoDateToLocalDate,
  localDateToISODate,
} from '@/lib/date'
import { useBookSlot } from '@/components/client/use-book-slot'
import { BookingConfirmation } from '@/components/client/booking-confirmation'
import { SlotPicker, slotTimeLabel } from '@/components/client/slot-picker'
import { formatPriceRange } from '@/lib/price'
import {
  PHOTOGRAPHER_SPECIALTIES,
  type AvailabilitySlot,
  type PhotographerProfile,
} from '@/types/database'

export type SlotWithPhotographer = AvailabilitySlot & {
  photographer: Pick<
    PhotographerProfile,
    | 'id'
    | 'display_name'
    | 'city'
    | 'base_price'
    | 'price_max'
    | 'specialty'
    | 'specialty_other'
    | 'deposit_policy'
    | 'payment_terms'
    | 'payment_link'
  >
}

const PANEL = 'rounded-3xl bg-card p-5 sm:p-6'
const FIELD =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function CalendarSearch({
  initialSlots,
  paymentsEnabled,
}: {
  initialSlots: SlotWithPhotographer[]
  paymentsEnabled: boolean
}) {
  const supabase = createClient()
  const [slots, setSlots] = useState(initialSlots)
  const [cityFilter, setCityFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('')

  // Live-remove a slot the moment anyone books or deletes it, so a client
  // never tries to book something another client just took.
  useEffect(() => {
    const channel = supabase
      .channel('client-search-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_slots' },
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
  }, [supabase])

  const filteredSlots = useMemo(() => {
    const maxPrice =
      maxPriceFilter.trim() === '' ? null : Number.parseFloat(maxPriceFilter)
    const city = cityFilter.trim().toLowerCase()

    return slots.filter((slot) => {
      const p = slot.photographer
      if (city && !(p.city ?? '').toLowerCase().includes(city)) return false
      if (maxPrice != null && p.base_price != null && p.base_price > maxPrice)
        return false
      if (specialtyFilter) {
        const style =
          p.specialty === 'Other' ? p.specialty_other : p.specialty
        if (style !== specialtyFilter) return false
      }
      return true
    })
  }, [slots, cityFilter, maxPriceFilter, specialtyFilter])

  const availableDateStrings = useMemo(
    () => [...new Set(filteredSlots.map((s) => s.date))].sort(),
    [filteredSlots]
  )

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    initialSlots.length > 0 ? isoDateToLocalDate(initialSlots[0].date) : undefined
  )

  const { bookingSlotId, error, confirmation, clearConfirmation, bookSlot } =
    useBookSlot(paymentsEnabled)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const isBooking = bookingSlotId !== null

  const selectedDateISO = selectedDate
    ? localDateToISODate(selectedDate)
    : null

  const daySlots = selectedDateISO
    ? filteredSlots.filter((s) => s.date === selectedDateISO)
    : []

  const byPhotographer = new Map<string, SlotWithPhotographer[]>()
  for (const slot of daySlots) {
    const existing = byPhotographer.get(slot.photographer.id)
    if (existing) {
      existing.push(slot)
    } else {
      byPhotographer.set(slot.photographer.id, [slot])
    }
  }

  const events: CalendarEvent[] = availableDateStrings.map((date) => ({
    id: date,
    title: 'Available',
    start: isoDateToLocalDate(date),
    end: isoDateToLocalDate(date),
  }))

  function handleBook(slot: SlotWithPhotographer) {
    const { photographer } = slot
    const photographerName = photographer.display_name ?? 'the photographer'
    bookSlot(
      {
        slotId: slot.id,
        photographerId: photographer.id,
        photographerName,
        basePrice: photographer.base_price,
        summary: {
          photographerName,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          priceLabel: formatPriceRange(photographer.base_price, photographer.price_max),
          depositPolicy: photographer.deposit_policy,
          paymentTerms: photographer.payment_terms,
          paymentLink: photographer.payment_link,
        },
      },
      () => setSlots((prev) => prev.filter((s) => s.id !== slot.id))
    )
  }

  if (confirmation) {
    return (
      <div className="mx-auto max-w-xl">
        <BookingConfirmation booking={confirmation} onBookAnother={clearConfirmation} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-4">
          <div className={cn(PANEL, 'grid gap-4 sm:grid-cols-3')}>
            <div className="space-y-2">
              <Label htmlFor="cityFilter">Location</Label>
              <Input
                id="cityFilter"
                placeholder="e.g. Richmond"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPriceFilter">Max price ($)</Label>
              <Input
                id="maxPriceFilter"
                type="number"
                min="0"
                placeholder="Any"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialtyFilter">Style</Label>
              <select
                id="specialtyFilter"
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className={FIELD}
              >
                <option value="">Any style</option>
                {PHOTOGRAPHER_SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={PANEL}>
            <AvailabilityCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-36">
          <h2 className="text-2xl font-semibold tracking-tight">
            {selectedDateISO
              ? formatDateHeading(selectedDateISO)
              : 'Select a date'}
          </h2>

          {byPhotographer.size === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <CalendarX2 className="size-6" strokeWidth={1.75} />
              </span>
              <p className="max-w-xs text-sm text-muted-foreground">
                No photographers match your filters this day. Try another date
                or adjust your filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...byPhotographer.entries()].map(([photographerId, pSlots]) => {
                const photographer = pSlots[0].photographer
                const style =
                  photographer.specialty === 'Other'
                    ? photographer.specialty_other
                    : photographer.specialty
                const name = photographer.display_name ?? 'Photographer'
                // Derived per card, so a slot that just got booked or filtered out can't stay selected.
                const selectedSlot =
                  pSlots.find((s) => s.id === selectedSlotId) ?? null
                return (
                  <article key={photographerId} className={PANEL}>
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground"
                      >
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/client/photographers/${photographerId}`}
                          className="block truncate text-lg font-semibold tracking-tight hover:text-primary"
                        >
                          {name}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {photographer.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {photographer.city}
                            </span>
                          )}
                          {style && (
                            <span className="inline-flex items-center gap-1">
                              <Aperture className="size-3.5" />
                              {style}
                            </span>
                          )}
                          {photographer.base_price != null && (
                            <span className="font-medium text-foreground">
                              from ${photographer.base_price}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <SlotPicker
                        label={`Available times with ${name}`}
                        slots={pSlots}
                        selectedId={selectedSlot?.id ?? null}
                        onSelect={setSelectedSlotId}
                        disabled={isBooking}
                      />
                    </div>
                    {selectedSlot && (
                      <Button
                        type="button"
                        size="lg"
                        className="mt-4 h-12 w-full text-base"
                        disabled={isBooking}
                        onClick={() => handleBook(selectedSlot)}
                      >
                        {isBooking ? 'Booking…' : `Book ${slotTimeLabel(selectedSlot)}`}
                      </Button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
