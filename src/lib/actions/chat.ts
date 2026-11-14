'use server'

import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MESSAGE_MAX_LENGTH } from '@/lib/chat'
import { notifyMessageRecipient } from '@/lib/chat-notify'
import type { BookingMessage } from '@/types/database'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The insert runs with the user's session, so RLS decides who may write
// (members of an existing conversation only). The email goes out after the
// response and can never fail the send.
export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ message: BookingMessage | null; error: string | null }> {
  const text = body.trim()
  if (!UUID_RE.test(conversationId) || text === '' || text.length > MESSAGE_MAX_LENGTH) {
    return { message: null, error: 'This message is empty or too long.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { message: null, error: 'Your session expired. Please sign in again.' }

  const { data, error } = await supabase
    .from('booking_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select()
    .single()

  if (error || !data) {
    console.error('Sending message failed:', error)
    return {
      message: null,
      error: "Your message couldn't be sent. Check your connection and try again.",
    }
  }

  await markConversationRead(conversationId)
  after(() => notifyMessageRecipient(data.id, user.id))
  return { message: data, error: null }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!UUID_RE.test(conversationId)) return
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  })
  if (error) console.error('Marking conversation read failed:', error)
}

// Clients only (the start_conversation RPC enforces it): opens the existing
// chat with this photographer or creates it.
export async function startConversation(formData: FormData): Promise<void> {
  const photographerId = String(formData.get('photographerId') ?? '')
  if (!UUID_RE.test(photographerId)) throw new Error('Invalid photographer.')

  const supabase = await createClient()
  const { data: conversationId, error } = await supabase.rpc('start_conversation', {
    p_photographer_id: photographerId,
  })
  if (error || !conversationId) {
    console.error('Starting conversation failed:', error)
    throw new Error("Couldn't open the chat. Try again.")
  }
  redirect(`/dashboard/client/messages?conversation=${conversationId}`)
}
