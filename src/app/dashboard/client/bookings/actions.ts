'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/guest-booking'
import { reviewError } from '@/lib/booking-steps'

// The database (submit_review) is the real gate: own booking, completed,
// one review per booking. This only validates input and reports back.
export async function submitReview(
  bookingId: string,
  rating: number,
  body: string
): Promise<{ error: string | null }> {
  const invalid = reviewError(rating, body)
  if (invalid) return { error: invalid }
  if (!isUuid(bookingId)) return { error: 'Booking not found.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_body: body.trim() || null,
  })
  if (error) {
    console.error(`Submitting review failed for booking ${bookingId}:`, error.message)
    return { error: "Your review couldn't be saved. It may already exist; reload the page." }
  }
  revalidatePath('/dashboard/client/bookings')
  return { error: null }
}
