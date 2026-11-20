'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { REVIEW_MAX_LENGTH, reviewError } from '@/lib/booking-steps'
import { submitReview } from '@/app/dashboard/client/bookings/actions'
import { usePreviewMode } from '@/components/preview/preview-mode'
import { cn } from '@/lib/utils'

const RATINGS = [1, 2, 3, 4, 5] as const

// Same neutral question for every completed booking; nothing is offered in
// exchange and every rating is accepted.
export function ReviewForm({ bookingId, photographerName }: { bookingId: string; photographerName: string }) {
  const isPreview = usePreviewMode()
  const [rating, setRating] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = reviewError(rating, body)
    if (invalid || rating == null) {
      setError(invalid)
      return
    }
    setError(null)
    if (isPreview) {
      setIsDone(true)
      return
    }
    setIsSaving(true)
    const result = await submitReview(bookingId, rating, body)
    setIsSaving(false)
    if (result.error) setError(result.error)
    else setIsDone(true)
  }

  if (isDone) {
    return <p className="text-sm font-medium text-success">Thanks, your review is on the profile.</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-muted p-4">
      <fieldset>
        <legend className="text-sm font-medium">
          How was your session with {photographerName}? Your review helps other students choose.
        </legend>
        <div role="radiogroup" aria-label="Rating" className="mt-3 flex gap-2">
          {RATINGS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} out of 5`}
              onClick={() => setRating(value)}
              className={cn(
                'flex size-11 items-center justify-center rounded-full border text-lg transition-colors',
                rating !== null && value <= rating
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-input bg-card hover:bg-muted'
              )}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor={`review-${bookingId}`}>Your review (optional)</Label>
        <Textarea
          id={`review-${bookingId}`}
          rows={3}
          maxLength={REVIEW_MAX_LENGTH}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Shown on the photographer&apos;s profile with your first name. Don&apos;t include contact details.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11 px-5" disabled={isSaving || rating === null}>
        {isSaving ? 'Saving…' : 'Post review'}
      </Button>
    </form>
  )
}
