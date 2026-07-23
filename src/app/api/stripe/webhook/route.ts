import Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/resend'
import { newBookingRequestEmail, balanceReceivedEmail } from '@/lib/email-templates'

async function notifyPhotographerOfSlot(
  supabase: ReturnType<typeof createServiceClient>,
  slotId: string,
  clientId: string,
  depositAmount: number
) {
  const { data: slot } = await supabase
    .from('availability_slots')
    .select('date, start_time, photographer_id')
    .eq('id', slotId)
    .single()

  if (!slot) return

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('user_id, display_name')
    .eq('id', slot.photographer_id)
    .single()

  if (!photographerProfile) return

  const { data: photographerAccount } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', photographerProfile.user_id)
    .single()

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', clientId)
    .single()

  if (!photographerAccount?.email) return

  const { subject, html } = newBookingRequestEmail({
    photographerName: photographerProfile.display_name ?? 'there',
    clientName: clientProfile?.full_name ?? 'A client',
    date: slot.date,
    startTime: slot.start_time,
    depositAmount,
  })
  await sendEmail({ to: photographerAccount.email, subject, html })
}

async function notifyPhotographerOfBalance(
  supabase: ReturnType<typeof createServiceClient>,
  bookingId: string
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('slot_id, client_id, balance_amount')
    .eq('id', bookingId)
    .single()

  if (!booking || booking.balance_amount == null) return

  const { data: slot } = await supabase
    .from('availability_slots')
    .select('photographer_id')
    .eq('id', booking.slot_id)
    .single()

  if (!slot) return

  const { data: photographerProfile } = await supabase
    .from('photographer_profiles')
    .select('user_id, display_name')
    .eq('id', slot.photographer_id)
    .single()

  if (!photographerProfile) return

  const { data: photographerAccount } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', photographerProfile.user_id)
    .single()

  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', booking.client_id)
    .single()

  if (!photographerAccount?.email) return

  const { subject, html } = balanceReceivedEmail({
    photographerName: photographerProfile.display_name ?? 'there',
    clientName: clientProfile?.full_name ?? 'A client',
    balanceAmount: Number(booking.balance_amount),
  })
  await sendEmail({ to: photographerAccount.email, subject, html })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const stripe = getStripe()
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  const supabase = createServiceClient()

  if (metadata.type === 'deposit') {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase.rpc('finalize_paid_booking', {
        p_slot_id: metadata.slot_id,
        p_client_id: metadata.client_id,
        p_deposit_amount: Number(metadata.deposit_amount),
        p_balance_amount: Number(metadata.balance_amount),
        p_stripe_checkout_session_id: session.id,
        p_stripe_payment_intent_id: String(session.payment_intent ?? ''),
      })

      if (error) {
        // Lost the slot race — refund in full and stop. 200 so Stripe
        // doesn't retry (retrying would fail the same way forever).
        if (session.payment_intent) {
          try {
            await stripe.refunds.create({
              payment_intent: String(session.payment_intent),
            })
          } catch (refundErr) {
            console.error('Refund after lost slot race failed:', refundErr)
          }
        }
        return NextResponse.json({ received: true })
      }

      await notifyPhotographerOfSlot(
        supabase,
        metadata.slot_id,
        metadata.client_id,
        Number(metadata.deposit_amount)
      )
    }

    return NextResponse.json({ received: true })
  }

  if (metadata.type === 'balance') {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', metadata.booking_id)
      .not('balance_paid_at', 'is', null)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase.rpc('finalize_balance_payment', {
        p_booking_id: metadata.booking_id,
        p_stripe_checkout_session_id: session.id,
        p_stripe_payment_intent_id: String(session.payment_intent ?? ''),
      })

      if (!error) {
        await notifyPhotographerOfBalance(supabase, metadata.booking_id)
      }
    }

    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
