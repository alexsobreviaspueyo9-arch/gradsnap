'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { todayISODate, formatDateHeading, groupByDate } from '@/lib/date'
import type { AvailabilitySlot } from '@/types/database'

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
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!date || !startTime || !endTime) {
      setError('Please fill in the date, start time and end time.')
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
        date,
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

      <Card>
        <CardHeader>
          <CardTitle>Add a slot</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddSlot}>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                min={todayISODate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
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
          </CardContent>
          <CardContent className="pt-0">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add slot'}
            </Button>
          </CardContent>
        </form>
      </Card>

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No slots yet — add your first one above.
        </p>
      ) : (
        <div className="space-y-4">
          {groupByDate(slots).map(([slotDate, dateSlots]) => (
            <Card key={slotDate}>
              <CardHeader>
                <CardTitle className="text-base">
                  {formatDateHeading(slotDate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dateSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span>
                        {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                      </span>
                      <Badge variant={slot.is_booked ? 'outline' : 'secondary'}>
                        {slot.is_booked ? 'Booked' : 'Open'}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={slot.is_booked || deletingId === slot.id}
                      title={
                        slot.is_booked
                          ? "This slot has a booking and can't be deleted."
                          : undefined
                      }
                      onClick={() => handleDelete(slot)}
                    >
                      {deletingId === slot.id ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/photographer"
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        Back to dashboard
      </Link>
    </div>
  )
}
