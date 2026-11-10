// Hard-coded sample data for the admin preview. Never read from or written to
// the database; ids are fixed strings, dates are relative to today.
import { todayISODate, isoDateToLocalDate, localDateToISODate } from '@/lib/date'
import { canWriteToChat, type Conversation } from '@/lib/chat'
import type { SlotWithPhotographer } from '@/components/client/CalendarSearch'
import type { BookingWithDetails } from '@/components/photographer/BookingsManager'
import type {
  AvailabilitySlot,
  BookingMessage,
  BookingStatus,
  PhotographerProfile,
  PortfolioPhoto,
} from '@/types/database'

export const PREVIEW_PHOTOGRAPHER_ID = 'preview-photographer'
const PHOTOGRAPHER_USER_ID = 'preview-photographer-user'
export const PREVIEW_CLIENT_ID = 'preview-client'

function day(offset: number): string {
  const today = isoDateToLocalDate(todayISODate())
  return localDateToISODate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
  )
}

export const photographer: PhotographerProfile = {
  id: PREVIEW_PHOTOGRAPHER_ID,
  user_id: PHOTOGRAPHER_USER_ID,
  display_name: 'Maya Chen',
  bio: 'Candid, warm portraits on campus. Ten years shooting graduations at UVA, VCU and JMU.',
  city: 'Charlottesville, VA',
  base_price: 180,
  price_max: 320,
  session_duration_minutes: 60,
  specialty: 'Natural light',
  specialty_other: null,
  instagram_url: 'https://instagram.com/example',
  social_links: [{ label: 'Website', url: 'https://example.com' }],
  weekly_availability: {
    sat: { start: '09:00', end: '17:00' },
    sun: { start: '10:00', end: '16:00' },
  },
  payment_link: 'https://example.com/pay',
  payment_terms: '$50 deposit to confirm, the rest on the day of the session.',
  deposit_policy: null,
  payment_method: 'stripe',
  requires_deposit: true,
  has_signed_contract: true,
  contract_signed_at: null,
  status: 'claimed',
  invite_token: null,
  invite_expires_at: null,
  lead_id: null,
  created_at: '2026-09-01T12:00:00Z',
}

function slot(id: string, offset: number, start: string, end: string, isBooked = false): AvailabilitySlot {
  return {
    id,
    photographer_id: PREVIEW_PHOTOGRAPHER_ID,
    date: day(offset),
    start_time: start,
    end_time: end,
    is_booked: isBooked,
  } as AvailabilitySlot
}

export const slots: AvailabilitySlot[] = [
  slot('preview-slot-1', 2, '10:00:00', '11:00:00', true),
  slot('preview-slot-2', 2, '13:00:00', '14:00:00'),
  slot('preview-slot-3', 5, '09:30:00', '10:30:00'),
  slot('preview-slot-4', 9, '15:00:00', '16:00:00', true),
  slot('preview-slot-5', 12, '11:00:00', '12:00:00'),
  slot('preview-slot-6', 16, '10:00:00', '11:00:00'),
]

export const openSlots = slots.filter((s) => !s.is_booked)

export const searchSlots: SlotWithPhotographer[] = openSlots.map((s) => ({ ...s, photographer }))

const PHOTO_IDS = [
  '1570897234456-a6d0a709574f',
  '1619279302118-43033660826a',
  '1639765766830-d829d2fe4219',
]

export const photos: PortfolioPhoto[] = Array.from({ length: 6 }, (_, i) => ({
  id: `preview-photo-${i}`,
  photographer_id: PREVIEW_PHOTOGRAPHER_ID,
  image_url: `https://images.unsplash.com/photo-${PHOTO_IDS[i % PHOTO_IDS.length]}?q=80&w=1200&auto=format&fit=crop`,
  caption: i === 0 ? 'The Lawn at golden hour' : null,
  sort_order: i,
})) as PortfolioPhoto[]

const CHAT_BOOKING_ID = 'preview-booking-1'

function booking(
  id: string,
  bookedSlot: AvailabilitySlot,
  status: BookingStatus,
  clientName: string,
  paid: boolean
): BookingWithDetails {
  return {
    id,
    slot_id: bookedSlot.id,
    client_id: id === CHAT_BOOKING_ID ? PREVIEW_CLIENT_ID : `${id}-client`,
    status,
    payment_status: paid ? 'paid' : 'pending',
    created_at: '2026-10-10T10:00:00Z',
    deposit_amount: null,
    deposit_paid_at: null,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    balance_amount: null,
    balance_paid_at: null,
    balance_checkout_session_id: null,
    balance_payment_intent_id: null,
    deposit_refunded_at: null,
    deposit_refund_id: null,
    slot: bookedSlot,
    clientName,
  }
}

export const bookings: BookingWithDetails[] = [
  booking('preview-booking-2', slots[3], 'pending', 'Noah Williams', false),
  booking(CHAT_BOOKING_ID, slots[0], 'confirmed', 'Ava Thompson', true),
]

export const thread: BookingMessage[] = [
  { id: 'preview-msg-1', sender_id: PREVIEW_CLIENT_ID, body: 'Hi Maya! Can we shoot near the Rotunda? I would love a few with my family too.', created_at: '2026-10-15T17:58:00Z' },
  { id: 'preview-msg-2', sender_id: PHOTOGRAPHER_USER_ID, body: 'Absolutely, family shots are included. Bring your cap and gown, and maybe a second outfit.', created_at: '2026-10-15T18:05:00Z' },
  { id: 'preview-msg-3', sender_id: PREVIEW_CLIENT_ID, body: 'Great, thanks!', created_at: '2026-10-15T18:12:00Z' },
  { id: 'preview-msg-4', sender_id: PHOTOGRAPHER_USER_ID, body: 'See you by the fountain at 10!', created_at: '2026-10-15T18:20:00Z' },
].map((m) => ({ ...m, booking_id: CHAT_BOOKING_ID }) as BookingMessage)

function conversation(counterpartName: string): Conversation {
  const last = thread[thread.length - 1]
  return {
    id: CHAT_BOOKING_ID,
    status: 'confirmed',
    created_at: '2026-10-10T10:00:00Z',
    date: slots[0].date,
    start_time: slots[0].start_time,
    counterpartName,
    canWrite: canWriteToChat('confirmed'),
    lastMessage: { body: last.body, created_at: last.created_at, sender_id: last.sender_id },
  }
}

export const viewers = {
  photographer: { userId: PHOTOGRAPHER_USER_ID, conversations: [conversation('Ava Thompson')] },
  client: { userId: PREVIEW_CLIENT_ID, conversations: [conversation('Maya Chen')] },
}

// Mirrors the real messages pages: ?booking= picks the open thread.
export function previewThread(
  conversations: Conversation[],
  bookingId: string | undefined
): { selected: Conversation | null; messages: BookingMessage[] } {
  const selected = conversations.find((c) => c.id === bookingId) ?? null
  return { selected, messages: selected ? thread.filter((m) => m.booking_id === selected.id) : [] }
}
