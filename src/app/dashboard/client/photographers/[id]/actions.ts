'use server'

import { after } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { REF_COOKIE, parseRefCode } from '@/lib/ref-code'
import { isUuid } from '@/lib/guest-booking'
import { sendBookingRequestEmails } from '@/lib/booking-emails'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function startDepositCheckout(input: {
  slotId: string
  photographerId: string
  photographerName: string
  basePrice: number
}): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: slot } = await supabase
    .from('availability_slots')
    .select('id, is_booked, date, start_time, end_time')
    .eq('id', input.slotId)
    .single()

  if (!slot || slot.is_booked) {
    throw new Error('This slot is no longer available.')
  }

  const totalCents = Math.round(input.basePrice * 100)
  const depositCents = Math.round(totalCents / 2)
  const balanceCents = totalCents - depositCents

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: depositCents,
          product_data: {
            name: `Deposit — session with ${input.photographerName}`,
            description: `${slot.date}, ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)} · 50% deposit, balance due after the session`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'deposit',
      slot_id: input.slotId,
      client_id: user.id,
      deposit_amount: (depositCents / 100).toFixed(2),
      balance_amount: (balanceCents / 100).toFixed(2),
    },
    success_url: `${process.env.APP_URL}/dashboard/client/photographers/${input.photographerId}?booked=1`,
    cancel_url: `${process.env.APP_URL}/dashboard/client/photographers/${input.photographerId}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  })

  if (!session.url) {
    throw new Error('Could not start checkout.')
  }

  redirect(session.url)
}

// Used while PAYMENTS_ENABLED=false (e.g. Stripe account not yet verified).
// Books the slot directly with no payment involved — same as the Sprint 3
// flow. Switch PAYMENTS_ENABLED to 'true' once payments are ready; no code
// changes needed on this path when that happens.
export async function bookSlotFree(slotId: string, packageId: string | null = null): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // A personal-link code only counts if book_slot finds it belongs to this
  // slot's photographer; otherwise the booking is 'marketplace'.
  const refCode = parseRefCode((await cookies()).get(REF_COOKIE)?.value)
  // book_slot checks the package belongs to this slot's photographer.
  const { data: booking, error } = await supabase.rpc('book_slot', {
    p_slot_id: slotId,
    p_ref_code: refCode,
    p_package_id: isUuid(packageId) ? packageId : null,
  })

  if (error) throw new Error(error.message)
  if (booking?.client_id === user.id) {
    after(() => sendBookingRequestEmails(booking.id))
  }
}
