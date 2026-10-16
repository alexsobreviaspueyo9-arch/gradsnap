import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_TIME_ZONE } from '@/lib/date'
import type {
  BookingMessage,
  BookingStatus,
  Database,
} from '@/types/database'

export const MESSAGE_MAX_LENGTH = 2000
// Statuses whose thread is listed; only these two accept new messages.
const CHAT_STATUSES = ['confirmed', 'completed', 'cancelled'] as const
const WRITABLE_STATUSES: readonly BookingStatus[] = ['confirmed', 'completed']
const THREAD_LIMIT = 500

export type ChatBooking = {
  id: string
  status: BookingStatus
  created_at: string
  date: string
  start_time: string
  counterpartName: string
}

export type Conversation = ChatBooking & {
  canWrite: boolean
  lastMessage: Pick<BookingMessage, 'body' | 'created_at' | 'sender_id'> | null
}

export function canWriteToChat(status: BookingStatus): boolean {
  return WRITABLE_STATUSES.includes(status)
}

// Newest activity first. A cancelled booking nobody wrote in has nothing to
// show, so it's dropped.
export function buildConversations(
  bookings: ChatBooking[],
  messages: Pick<BookingMessage, 'booking_id' | 'body' | 'created_at' | 'sender_id'>[]
): Conversation[] {
  const lastByBooking = new Map<string, Conversation['lastMessage']>()
  for (const message of messages) {
    const current = lastByBooking.get(message.booking_id)
    if (!current || message.created_at > current.created_at) {
      lastByBooking.set(message.booking_id, {
        body: message.body,
        created_at: message.created_at,
        sender_id: message.sender_id,
      })
    }
  }

  return bookings
    .map((booking) => ({
      ...booking,
      canWrite: canWriteToChat(booking.status),
      lastMessage: lastByBooking.get(booking.id) ?? null,
    }))
    .filter((c) => c.canWrite || c.lastMessage !== null)
    .sort((a, b) =>
      (b.lastMessage?.created_at ?? b.created_at).localeCompare(
        a.lastMessage?.created_at ?? a.created_at
      )
    )
}

// Timestamps are shown in the market's zone so server and browser render
// the same string (no hydration mismatch).
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type Supabase = SupabaseClient<Database>

async function loadChatBookings(
  supabase: Supabase,
  role: 'client' | 'photographer',
  userId: string
): Promise<ChatBooking[]> {
  let slotFilter: string[] | null = null
  if (role === 'photographer') {
    const { data: profile } = await supabase
      .from('photographer_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (!profile) return []
    const { data: ownSlots } = await supabase
      .from('availability_slots')
      .select('id')
      .eq('photographer_id', profile.id)
    slotFilter = (ownSlots ?? []).map((s) => s.id)
    if (slotFilter.length === 0) return []
  }

  let query = supabase
    .from('bookings')
    .select('id, status, created_at, slot_id, client_id')
    .in('status', [...CHAT_STATUSES])
  query = slotFilter ? query.in('slot_id', slotFilter) : query.eq('client_id', userId)
  const { data: bookings } = await query
  if (!bookings || bookings.length === 0) return []

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('id, date, start_time, photographer_id')
    .in('id', [...new Set(bookings.map((b) => b.slot_id))])
  const slotsById = new Map((slots ?? []).map((s) => [s.id, s]))

  const names = new Map<string, string>()
  if (role === 'client') {
    const photographerIds = [...new Set((slots ?? []).map((s) => s.photographer_id))]
    const { data: photographers } = await supabase
      .from('photographer_profiles')
      .select('id, display_name')
      .in('id', photographerIds)
    for (const p of photographers ?? []) {
      names.set(p.id, p.display_name ?? 'Your photographer')
    }
  } else {
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...new Set(bookings.map((b) => b.client_id))])
    for (const c of clients ?? []) {
      names.set(c.id, c.full_name ?? 'Client')
    }
  }

  return bookings.flatMap((booking) => {
    const slot = slotsById.get(booking.slot_id)
    if (!slot) return []
    const nameKey = role === 'client' ? slot.photographer_id : booking.client_id
    return [
      {
        id: booking.id,
        status: booking.status,
        created_at: booking.created_at,
        date: slot.date,
        start_time: slot.start_time,
        counterpartName:
          names.get(nameKey) ?? (role === 'client' ? 'Your photographer' : 'Client'),
      },
    ]
  })
}

export async function loadConversations(
  supabase: Supabase,
  role: 'client' | 'photographer',
  userId: string
): Promise<Conversation[]> {
  const bookings = await loadChatBookings(supabase, role, userId)
  if (bookings.length === 0) return []

  const { data: messages } = await supabase
    .from('booking_messages')
    .select('booking_id, body, created_at, sender_id')
    .in('booking_id', bookings.map((b) => b.id))
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT)

  return buildConversations(bookings, messages ?? [])
}

export async function loadThread(
  supabase: Supabase,
  bookingId: string
): Promise<BookingMessage[]> {
  const { data } = await supabase
    .from('booking_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT)
  // Newest THREAD_LIMIT messages, displayed oldest first.
  return [...(data ?? [])].reverse()
}
