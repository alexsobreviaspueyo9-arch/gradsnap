import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateHeading, todayInAppZone } from '@/lib/date'
import {
  formatTimeLeft,
  isUnread,
  medianResponseHours,
  requestTimeLeftMs,
} from '@/lib/photographer-dashboard'
import type { TodayData } from '@/components/dashboard/photographer-today'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>
const RESPONSE_WINDOW_MS = 90 * 86_400_000
const RECENT_MESSAGES = 300

// Everything for the "Today" panel, read with the photographer's own session
// (RLS). Expired requests are swept first so none shows as pending.
export async function loadTodayData(
  supabase: Supabase,
  photographerId: string,
  userId: string
): Promise<TodayData> {
  await supabase.rpc('expire_stale_bookings')

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('id, date, start_time')
    .eq('photographer_id', photographerId)
  const slotById = new Map((slots ?? []).map((s) => [s.id, s]))
  const slotIds = [...slotById.keys()]

  const { data: bookings } =
    slotIds.length > 0
      ? await supabase
          .from('bookings')
          .select('id, slot_id, client_id, status, created_at, responded_at, delivered_at')
          .in('slot_id', slotIds)
      : { data: [] }
  const rows = bookings ?? []

  const clientIds = [...new Set(rows.map((b) => b.client_id))]
  const { data: clients } =
    clientIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', clientIds)
      : { data: [] }
  const nameOf = (id: string) =>
    (clients ?? []).find((c) => c.id === id)?.full_name?.split(' ')[0] ?? 'Client'

  const today = todayInAppZone()
  const requests = rows
    .filter((b) => b.status === 'pending')
    .map((b) => {
      const slot = slotById.get(b.slot_id)
      return {
        id: b.id,
        clientName: nameOf(b.client_id),
        when: slot ? `${formatDateHeading(slot.date)}, ${slot.start_time.slice(0, 5)}` : '',
        timeLeft: formatTimeLeft(requestTimeLeftMs(b.created_at)),
        createdAt: b.created_at,
      }
    })
    // Oldest request first: it expires first.
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ id: r.id, clientName: r.clientName, when: r.when, timeLeft: r.timeLeft }))

  const sessionsToday = rows
    .filter((b) => b.status === 'confirmed' && slotById.get(b.slot_id)?.date === today)
    .map((b) => ({
      id: b.id,
      clientName: nameOf(b.client_id),
      time: slotById.get(b.slot_id)!.start_time.slice(0, 5),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))

  const since = Date.now() - RESPONSE_WINDOW_MS
  const responseHours = medianResponseHours(rows.filter((b) => new Date(b.created_at).getTime() > since))

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, photographer_last_read_at')
    .eq('photographer_id', photographerId)
  const convIds = (conversations ?? []).map((c) => c.id)
  const { data: messages } =
    convIds.length > 0
      ? await supabase
          .from('booking_messages')
          .select('conversation_id, sender_id, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(RECENT_MESSAGES)
      : { data: [] }
  const lastByConv = new Map<string, { sender_id: string; created_at: string }>()
  for (const m of messages ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m)
  const unreadCount = (conversations ?? []).filter((c) =>
    isUnread(lastByConv.get(c.id) ?? null, userId, c.photographer_last_read_at)
  ).length

  return {
    requests,
    unreadCount,
    sessionsToday,
    pendingDeliveries: rows.filter((b) => b.status === 'completed' && !b.delivered_at).length,
    responseHours,
  }
}
