'use client'

import { useState } from 'react'
import {
  startDepositCheckout,
  bookSlotFree,
} from '@/app/dashboard/client/photographers/[id]/actions'
import { trackEvent } from '@/lib/posthog'

export function useBookSlot(paymentsEnabled: boolean) {
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function bookSlot(
    input: {
      slotId: string
      photographerId: string
      photographerName: string
      basePrice: number | null
    },
    onSettled: () => void
  ) {
    if (paymentsEnabled && input.basePrice == null) return

    setBookingSlotId(input.slotId)
    setError(null)
    setSuccessMessage(null)
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
        setSuccessMessage(
          'Booking requested! The photographer will confirm shortly.'
        )
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

  return { bookingSlotId, error, successMessage, bookSlot }
}
