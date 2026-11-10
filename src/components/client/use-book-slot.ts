'use client'

import { useState } from 'react'
import {
  startDepositCheckout,
  bookSlotFree,
} from '@/app/dashboard/client/photographers/[id]/actions'
import { trackEvent } from '@/lib/posthog'
import { usePreviewMode } from '@/components/preview/preview-mode'
import type { BookingSummary } from '@/components/client/booking-confirmation'

export function useBookSlot(paymentsEnabled: boolean) {
  const isPreview = usePreviewMode()
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<BookingSummary | null>(null)

  async function bookSlot(
    input: {
      slotId: string
      photographerId: string
      photographerName: string
      basePrice: number | null
      summary: BookingSummary
    },
    onSettled: () => void
  ) {
    if (paymentsEnabled && input.basePrice == null) return
    if (isPreview) {
      // Admin preview: show the confirmation without booking or tracking.
      onSettled()
      setConfirmation(input.summary)
      return
    }

    setBookingSlotId(input.slotId)
    setError(null)
    setConfirmation(null)
    trackEvent('booking_started', {
      slotId: input.slotId,
      photographerId: input.photographerId,
    })

    try {
      if (paymentsEnabled && input.basePrice != null) {
        await startDepositCheckout({
          slotId: input.slotId,
          photographerId: input.photographerId,
          photographerName: input.photographerName,
          basePrice: input.basePrice,
        })
      } else {
        await bookSlotFree(input.slotId)
        onSettled()
        trackEvent('booking_completed', {
          slotId: input.slotId,
          photographerId: input.photographerId,
        })
        setConfirmation(input.summary)
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
        onSettled()
      }
    } finally {
      setBookingSlotId(null)
    }
  }

  return {
    bookingSlotId,
    error,
    confirmation,
    clearConfirmation: () => setConfirmation(null),
    bookSlot,
  }
}
