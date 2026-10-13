'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  weeklyDates,
} from '@/lib/date'
import type { AvailabilitySlot } from '@/types/database'

const PANEL = 'rounded-3xl bg-card p-5 sm:p-6'
const REPEAT_WEEK_OPTIONS = [4, 8, 12] as const
const DEFAULT_REPEAT_WEEKS = 8

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
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeeks, setRepeatWeeks] = useState<number>(DEFAULT_REPEAT_WEEKS)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedDateISO = selectedDate ? localDateToISODate(selectedDate) : null
  // The month grid shows only bookable slots; booked ones stay listed (and
  // labelled) in the day panel so it's clear why they can't be deleted.
  const events: CalendarEvent[] = slots
    .filter((slot) => !slot.is_booked)
    .map((slot) => ({
      id: slot.id,
      title: slot.start_time.slice(0, 5),
      start: slotDateTime(slot.date, slot.start_time),
      end: slotDateTime(slot.date, slot.end_time),
    }))
  const weekdayName = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
    : null
  const daySlots = selectedDateISO
    ? slots.filter((s) => s.date === selectedDateISO)
    : []

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

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

    const dates = repeatWeekly
      ? weeklyDates(selectedDateISO, repeatWeeks)
      : [selectedDateISO]
    const rows = dates.map((date) => ({
      photographer_id: photographerId,
      date,
      start_time: startTime,
      end_time: endTime,
    }))

    // ON CONFLICT DO NOTHING: weeks that already have a slot at this start
    // time are skipped instead of failing the whole batch.
    const { data: inserted, error: insertError } = await supabase
      .from('availability_slots')
      .upsert(rows, {
        onConflict: 'photographer_id,date,start_time',
        ignoreDuplicates: true,
      })
      .select()

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    const added = inserted ?? []
    const skipped = rows.length - added.length
    if (added.length === 0) {
      setError(
        repeatWeekly
          ? 'You already have a slot at that start time on every one of those days.'
          : 'You already have a slot at that date and start time.'
      )
      return
    }

    added.forEach(() => trackEvent('availability_slot_added'))
    setSlots((prev) => sortSlots([...prev, ...added]))
    setStartTime('')
    setEndTime('')
    if (repeatWeekly) {
      const plural = added.length === 1 ? '' : 's'
      const skippedNote = skipped > 0 ? ` (${skipped} skipped, already taken)` : ''
      setNotice(`Added ${added.length} weekly slot${plural}${skippedNote}.`)
    }
  }

  const submitLabel = submitting
    ? 'Adding…'
    : repeatWeekly
      ? `Add ${repeatWeeks} weekly slots`
      : 'Add slot'

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
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
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
            <h2 className="text-xl font-semibold tracking-tight">
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

              <div className="space-y-3 rounded-2xl bg-muted/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="repeatWeekly"
                    checked={repeatWeekly}
                    onCheckedChange={(v) => setRepeatWeekly(v === true)}
                  />
                  <Label htmlFor="repeatWeekly" className="cursor-pointer">
                    Repeat every {weekdayName ?? 'week'}
                  </Label>
                </div>
                {repeatWeekly && (
                  <div className="flex items-center gap-2 pl-7 text-sm text-muted-foreground">
                    <label htmlFor="repeatWeeks">for the next</label>
                    <select
                      id="repeatWeeks"
                      value={repeatWeeks}
                      onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                      className="h-9 rounded-lg border border-input bg-card px-2 text-foreground"
                    >
                      {REPEAT_WEEK_OPTIONS.map((weeks) => (
                        <option key={weeks} value={weeks}>
                          {weeks} weeks
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-base"
                disabled={submitting || !selectedDateISO}
              >
                {submitLabel}
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
                          : 'bg-success-fill text-success'
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
