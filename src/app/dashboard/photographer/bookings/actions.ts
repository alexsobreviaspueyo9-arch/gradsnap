'use server'

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { sendEmail } from '@/lib/resend'
import {
  bookingConfirmedEmail,
  sessionCompletedBalanceEmail,
  bookingCancelledRefundedEmail,
} from '@/lib/email-templates'

async function loadOwnedBooking(bookingId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not signed in.')

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error('Booking not found.')

  const { data: slot } = await supabase
    .from('availability_slots')
    .select('id, date, start_time, end_time, photographer_id')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) throw new Error('Slot not found.')

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('display_name, user_id')
    .eq('id', slot.photographer_id)
    .single()

  if (!photographerProfile || photographerProfile.user_id !== user.id) {
    throw new Error('You do not own this booking.')
  }

  const { data: client } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', booking.client_id)
    .single()

  return {
    supabase,
    booking,
    slot,
    client: client ?? { full_name: null, email: null },
    photographer: photographerProfile,
  }
}

export async function confirmBooking(bookingId: string): Promise<void> {
  const { supabase, slot, client, photographer } =
    await loadOwnedBooking(bookingId)

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)

  if (client.email) {
    const { subject, html } = bookingConfirmedEmail({
      clientName: client.full_name ?? 'there',
      photographerName: photographer.display_name ?? 'your photographer',
      date: slot.date,
      startTime: slot.start_time,
    })
    await sendEmail({ to: client.email, subject, html })
  }
}

export async function completeBooking(bookingId: string): Promise<void> {
  const { supabase, booking, client, photographer } =
    await loadOwnedBooking(bookingId)

  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true'

  // Payments disabled, or this booking predates payments (no balance on
  // file): just mark it completed, no balance checkout / email.
  if (!paymentsEnabled || booking.balance_amount == null) {
    const { error: freeError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)
    if (freeError) throw new Error(freeError.message)
    return
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)

  const balanceSession = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: client.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(booking.balance_amount) * 100),
          product_data: {
            name: `Balance — session with ${photographer.display_name ?? 'your photographer'}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'balance',
      booking_id: bookingId,
    },
    success_url: `${process.env.APP_URL}/booking/balance-paid`,
    cancel_url: `${process.env.APP_URL}/`,
    expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  })

  if (client.email && balanceSession.url) {
    const { subject, html } = sessionCompletedBalanceEmail({
      clientName: client.full_name ?? 'there',
      photographerName: photographer.display_name ?? 'your photographer',
      balanceAmount: Number(booking.balance_amount),
      paymentLinkUrl: balanceSession.url,
    })
    await sendEmail({ to: client.email, subject, html })
  }
}

// Money for this booking moves outside GradSnap entirely (the client pays
// the photographer's own payment_link directly), so there's nothing to
// verify automatically — the photographer just tells us once they've been
// paid.
export async function setBookingPaymentStatus(
  bookingId: string,
  paymentStatus: 'pending' | 'paid'
): Promise<void> {
  const { supabase } = await loadOwnedBooking(bookingId)

  const { error } = await supabase
    .from('bookings')
    .update({ payment_status: paymentStatus })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { supabase, booking, client, photographer } =
    await loadOwnedBooking(bookingId)

  let refundId: string | null = null
  if (
    booking.deposit_paid_at &&
    !booking.deposit_refunded_at &&
    booking.stripe_payment_intent_id
  ) {
    const refund = await getStripe().refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
    })
    refundId = refund.id
  }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      ...(refundId
        ? {
            deposit_refunded_at: new Date().toISOString(),
            deposit_refund_id: refundId,
          }
        : {}),
    })
    .eq('id', bookingId)

  if (error) throw new Error(error.message)

  await supabase
    .from('availability_slots')
    .update({ is_booked: false })
    .eq('id', booking.slot_id)

  if (client.email && booking.deposit_amount != null) {
    const { subject, html } = bookingCancelledRefundedEmail({
      clientName: client.full_name ?? 'there',
      photographerName: photographer.display_name ?? 'your photographer',
      depositAmount: Number(booking.deposit_amount),
    })
    await sendEmail({ to: client.email, subject, html })
  }
}
