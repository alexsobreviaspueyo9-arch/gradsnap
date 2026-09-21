'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AvailabilityCalendar,
  type CalendarEvent,
} from '@/components/availability-calendar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/posthog'
import {
  formatDateHeading,
  isoDateToLocalDate,
  localDateToISODate,
  slotDateTime,
  todayISODate,
} from '@/lib/date'
import type { AvailabilitySlot } from '@/types/database'

const PANEL = 'rounded-3xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6'

function sortSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return [...slots].sort((a, b) =>
    a.date === b.date
      ? a.start_time.localeCompare(b.start_time)
      : a.date.localeCompare(b.date)
  )
}

export function AvailabilityManager({
  photographerId,
  initialSlots,
}: {
  photographerId: string
  initialSlots: AvailabilitySlot[]
}) {
  const supabase = createClient()

  const [slots, setSlots] = useState(() => sortSlots(initialSlots))
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    isoDateToLocalDate(todayISODate())
  )
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selectedDateISO = selectedDate ? localDateToISODate(selectedDate) : null
  const events: CalendarEvent[] = slots.map((slot) => ({
    id: slot.id,
    title: slot.start_time.slice(0, 5),
    start: slotDateTime(slot.date, slot.start_time),
    end: slotDateTime(slot.date, slot.end_time),
    booked: slot.is_booked,
  }))
  const daySlots = selectedDateISO
    ? slots.filter((s) => s.date === selectedDateISO)
    : []

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedDateISO || !startTime || !endTime) {
      setError('Please select a date and fill in the start and end time.')
      return
    }
    if (selectedDateISO < todayISODate()) {
      setError('Cannot add a slot in the past.')
      return
    }
    if (startTime >= endTime) {
      setError('Start time must be before end time.')
      return
    }

    setSubmitting(true)

    const { data: inserted, error: insertError } = await supabase
      .from('availability_slots')
      .insert({
        photographer_id: photographerId,
        date: selectedDateISO,
        start_time: startTime,
        end_time: endTime,
      })
      .select()
      .single()

    setSubmitting(false)

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You already have a slot at that date and start time.')
      } else {
        setError(insertError.message)
      }
      return
    }

    trackEvent('availability_slot_added')
    setSlots((prev) => sortSlots([...prev, inserted]))
    setStartTime('')
    setEndTime('')
  }

  async function handleDelete(slot: AvailabilitySlot) {
    if (!window.confirm('Delete this slot?')) return

    setDeletingId(slot.id)
    setError(null)

    const { error: deleteError } = await supabase
      .from('availability_slots')
      .delete()
      .eq('id', slot.id)

    setDeletingId(null)

    if (deleteError) {
      if (deleteError.code === '23503') {
        setError("This slot has a booking and can't be deleted.")
      } else {
        setError(deleteError.message)
      }
      return
    }

    setSlots((prev) => prev.filter((s) => s.id !== slot.id))
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className={PANEL}>
          <AvailabilityCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-36">
          <section className={PANEL}>
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {selectedDateISO
                ? formatDateHeading(selectedDateISO)
                : 'Select a date'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a time window clients can book on this day.
            </p>

            <form onSubmit={handleAddSlot} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={submitting || !selectedDateISO}
              >
                {submitting ? 'Adding…' : 'Add slot'}
              </Button>
            </form>
          </section>

          {daySlots.length > 0 && (
            <section className={cn(PANEL, 'space-y-2')}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Slots on this day
              </h3>
              {daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </span>
                    <Badge
                      className={cn(
                        slot.is_booked
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
                      )}
                    >
                      {slot.is_booked ? 'Booked' : 'Open'}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete slot"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={slot.is_booked || deletingId === slot.id}
                    title={
                      slot.is_booked
                        ? "This slot has a booking and can't be deleted."
                        : undefined
                    }
                    onClick={() => handleDelete(slot)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
