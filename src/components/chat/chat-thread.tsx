'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { MESSAGE_MAX_LENGTH, formatMessageTime } from '@/lib/chat'
import { usePreviewMode } from '@/components/preview/preview-mode'
import { markConversationRead, sendMessage } from '@/lib/actions/chat'
import type { BookingMessage } from '@/types/database'

type Props = {
  conversationId: string
  currentUserId: string
  canWrite: boolean
  templates?: { id: string; title: string; body: string }[]
  initialMessages: BookingMessage[]
}

function appendUnique(list: BookingMessage[], message: BookingMessage): BookingMessage[] {
  return list.some((m) => m.id === message.id) ? list : [...list, message]
}

export function ChatThread({
  conversationId,
  currentUserId,
  canWrite,
  initialMessages,
  templates = [],
}: Props) {
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
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as BookingMessage
          setMessages((prev) => appendUnique(prev, message))
          // Seen live, so the recipient doesn't also get an email for it.
          if (message.sender_id !== currentUserId) markConversationRead(conversationId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, conversationId, currentUserId, isPreview])

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
        booking_id: null,
        conversation_id: conversationId,
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

    // Server action: inserts with the user's session and emails the other
    // person (throttled) without ever blocking the send.
    const { message, error: sendError } = await sendMessage(conversationId, body)

    setIsSending(false)
    if (sendError || !message) {
      setError(sendError ?? "Your message couldn't be sent. Check your connection and try again.")
      return
    }
    setMessages((prev) => appendUnique(prev, message))
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
        {canWrite && templates.length > 0 && (
          <div className="mb-2">
            <label htmlFor="chat-template" className="sr-only">
              Insert a template
            </label>
            <select
              id="chat-template"
              value=""
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value)
                if (template) setDraft((current) => (current.trim() ? `${current}\n${template.body}` : template.body))
              }}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto"
            >
              <option value="">Insert a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
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
