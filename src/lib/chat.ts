import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_TIME_ZONE } from '@/lib/date'
import type { BookingMessage, Database } from '@/types/database'

export const MESSAGE_MAX_LENGTH = 2000
const THREAD_LIMIT = 500

// One per client + photographer pair; only clients start them.
export type ChatConversation = {
  id: string
  created_at: string
  counterpartName: string
}

export type Conversation = ChatConversation & {
  canWrite: boolean
  lastMessage: Pick<BookingMessage, 'body' | 'created_at' | 'sender_id'> | null
}

// Newest activity first; a conversation without messages sorts by when it
// was started.
export function buildConversations(
  conversations: ChatConversation[],
  messages: Pick<BookingMessage, 'conversation_id' | 'body' | 'created_at' | 'sender_id'>[]
): Conversation[] {
  const lastByConversation = new Map<string, Conversation['lastMessage']>()
  for (const message of messages) {
    const current = lastByConversation.get(message.conversation_id)
    if (!current || message.created_at > current.created_at) {
      lastByConversation.set(message.conversation_id, {
        body: message.body,
        created_at: message.created_at,
        sender_id: message.sender_id,
      })
    }
  }

  return conversations
    .map((conversation) => ({
      ...conversation,
      canWrite: true,
      lastMessage: lastByConversation.get(conversation.id) ?? null,
    }))
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

async function loadChatConversations(
  supabase: Supabase,
  role: 'client' | 'photographer',
  userId: string
): Promise<ChatConversation[]> {
  let query = supabase.from('conversations').select('id, created_at, client_id, photographer_id')
  if (role === 'photographer') {
    const { data: profile } = await supabase
      .from('photographer_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (!profile) return []
    query = query.eq('photographer_id', profile.id)
  } else {
    query = query.eq('client_id', userId)
  }
  const { data: conversations } = await query
  if (!conversations || conversations.length === 0) return []

  const names = new Map<string, string>()
  if (role === 'client') {
    const { data: photographers } = await supabase
      .from('photographer_profiles')
      .select('id, display_name')
      .in('id', [...new Set(conversations.map((c) => c.photographer_id))])
    for (const p of photographers ?? []) {
      names.set(p.id, p.display_name ?? 'Your photographer')
    }
  } else {
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [...new Set(conversations.map((c) => c.client_id))])
    for (const c of clients ?? []) {
      names.set(c.id, c.full_name ?? 'Client')
    }
  }

  return conversations.map((c) => ({
    id: c.id,
    created_at: c.created_at,
    counterpartName:
      names.get(role === 'client' ? c.photographer_id : c.client_id) ??
      (role === 'client' ? 'Your photographer' : 'Client'),
  }))
}

export async function loadConversations(
  supabase: Supabase,
  role: 'client' | 'photographer',
  userId: string
): Promise<Conversation[]> {
  const conversations = await loadChatConversations(supabase, role, userId)
  if (conversations.length === 0) return []

  const { data: messages } = await supabase
    .from('booking_messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', conversations.map((c) => c.id))
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT)

  return buildConversations(conversations, messages ?? [])
}

export async function loadThread(
  supabase: Supabase,
  conversationId: string
): Promise<BookingMessage[]> {
  const { data } = await supabase
    .from('booking_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(THREAD_LIMIT)
  // Newest THREAD_LIMIT messages, displayed oldest first.
  return [...(data ?? [])].reverse()
}
