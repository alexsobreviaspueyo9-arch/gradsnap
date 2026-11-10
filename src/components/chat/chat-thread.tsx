'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { MESSAGE_MAX_LENGTH, formatMessageTime } from '@/lib/chat'
import { usePreviewMode } from '@/components/preview/preview-mode'
import type { BookingMessage } from '@/types/database'

type Props = {
  bookingId: string
  currentUserId: string
  canWrite: boolean
  initialMessages: BookingMessage[]
}

function appendUnique(list: BookingMessage[], message: BookingMessage): BookingMessage[] {
  return list.some((m) => m.id === message.id) ? list : [...list, message]
}

export function ChatThread({ bookingId, currentUserId, canWrite, initialMessages }: Props) {
  const [supabase] = useState(createClient)
  const isPreview = usePreviewMode()
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPreview) return
    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => appendUnique(prev, payload.new as BookingMessage))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, bookingId, isPreview])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function send() {
    const body = draft.trim()
    if (!body || isSending) return
    if (isPreview) {
      // Admin preview: show the message on this page only; nothing is sent.
      const local = {
        id: crypto.randomUUID(),
        booking_id: bookingId,
        sender_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => appendUnique(prev, local))
      setDraft('')
      return
    }
    setError(null)
    setIsSending(true)

    const { data, error: insertError } = await supabase
      .from('booking_messages')
      .insert({ booking_id: bookingId, sender_id: currentUserId, body })
      .select()
      .single()

    setIsSending(false)
    if (insertError || !data) {
      setError("Your message couldn't be sent. Check your connection and try again.")
      return
    }
    setMessages((prev) => appendUnique(prev, data))
    setDraft('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send()
  }

  // Enter sends, Shift+Enter adds a line (the usual chat convention).
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5 sm:px-6"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hello and agree on the details of the session.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
              >
                <p
                  className={cn(
                    'max-w-[85%] rounded-3xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap sm:max-w-[70%]',
                    isOwn ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                  )}
                >
                  {message.body}
                </p>
                <span className="mt-1 px-2 text-xs text-muted-foreground">
                  {isOwn ? 'You · ' : ''}
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t px-4 py-4 sm:px-6">
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {canWrite ? (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <label htmlFor="chat-message" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={1}
              placeholder="Write a message"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl border border-input bg-card px-4 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            />
            <Button
              type="submit"
              className="h-11 px-5"
              disabled={isSending || draft.trim() === ''}
            >
              {isSending ? 'Sending…' : 'Send'}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            This booking was cancelled, so the chat is read-only.
          </p>
        )}
      </div>
    </div>
  )
}
