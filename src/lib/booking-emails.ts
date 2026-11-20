import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/resend'
import { formatPriceRange } from '@/lib/price'
import { SITE_URL, CONTACT_PATH } from '@/lib/site'
import {
  sessionReminderEmail,
  bookingConfirmedEmail,
  bookingRequestedClientEmail,
  bookingRequestedPhotographerEmail,
} from '@/lib/email-templates'
import type { BookingEmailKind } from '@/types/database'

// Server only. Callers have already checked that the signed-in user owns the
// booking (its client after book_slot, its photographer on confirm).
// claim_booking_email (service role) sets the notified_at flag first, so each
// email goes out at most once. Never throws; logs carry the booking id only.

async function claim(bookingId: string, kind: BookingEmailKind) {
  const { data, error } = await createServiceClient().rpc('claim_booking_email', {
    p_booking_id: bookingId,
    p_kind: kind,
  })
  if (error) {
    console.error(`Claiming ${kind} email failed for booking ${bookingId}:`, error.message)
    return null
  }
  return data?.[0] ?? null
}

const contactUrl = `${SITE_URL}${CONTACT_PATH}`

export async function sendBookingRequestEmails(bookingId: string): Promise<void> {
  try {
    const forClient = await claim(bookingId, 'client_booked')
    if (forClient?.recipient_email) {
      await sendEmail({
        to: forClient.recipient_email,
        ...bookingRequestedClientEmail({
          clientName: forClient.client_name ?? 'there',
          photographerName: forClient.photographer_name ?? 'your photographer',
          date: forClient.date,
          startTime: forClient.start_time,
          endTime: forClient.end_time,
          priceLabel: formatPriceRange(forClient.base_price, forClient.price_max),
          paymentTerms: forClient.payment_terms,
          contactUrl,
        }),
      })
    }

    const forPhotographer = await claim(bookingId, 'photographer_booked')
    if (forPhotographer?.recipient_email) {
      await sendEmail({
        to: forPhotographer.recipient_email,
        ...bookingRequestedPhotographerEmail({
          photographerName: forPhotographer.photographer_name ?? 'there',
          clientName: forPhotographer.client_name ?? 'A client',
          date: forPhotographer.date,
          startTime: forPhotographer.start_time,
          endTime: forPhotographer.end_time,
          bookingsUrl: `${SITE_URL}/dashboard/photographer/bookings`,
        }),
      })
    }
  } catch (err) {
    console.error(`Booking request emails failed for booking ${bookingId}:`, err instanceof Error ? err.message : err)
  }
}

export async function sendBookingConfirmedEmail(bookingId: string): Promise<void> {
  try {
    const target = await claim(bookingId, 'client_confirmed')
    if (!target?.recipient_email) return
    await sendEmail({
      to: target.recipient_email,
      ...bookingConfirmedEmail({
        clientName: target.client_name ?? 'there',
        photographerName: target.photographer_name ?? 'your photographer',
        date: target.date,
        startTime: target.start_time,
        contactUrl,
      }),
    })
  } catch (err) {
    console.error(`Booking confirmed email failed for booking ${bookingId}:`, err instanceof Error ? err.message : err)
  }
}

export type ReminderKind = 'reminder_48h' | 'reminder_day'

// Cron: every confirmed session due a reminder gets at most one of each kind.
export async function sendDueReminders(kind: ReminderKind): Promise<number> {
  const { data, error } = await createServiceClient().rpc('due_booking_reminders', { p_kind: kind })
  if (error) {
    console.error(`Listing ${kind} reminders failed:`, error.message)
    return 0
  }
  let sent = 0
  for (const { booking_id: bookingId } of data ?? []) {
    try {
      const target = await claim(bookingId, kind)
      if (!target?.recipient_email) continue
      await sendEmail({
        to: target.recipient_email,
        ...sessionReminderEmail({
          clientName: target.client_name ?? 'there',
          photographerName: target.photographer_name ?? 'your photographer',
          date: target.date,
          startTime: target.start_time,
          kind,
          bookingsUrl: `${SITE_URL}/dashboard/client/bookings`,
        }),
      })
      sent += 1
    } catch (err) {
      console.error(`Reminder ${kind} failed for booking ${bookingId}:`, err instanceof Error ? err.message : err)
    }
  }
  return sent
}
