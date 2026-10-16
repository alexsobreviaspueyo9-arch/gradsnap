import Link from 'next/link'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateHeading } from '@/lib/date'
import { formatMessageTime, type Conversation } from '@/lib/chat'
import { ChatThread } from '@/components/chat/chat-thread'
import type { BookingMessage } from '@/types/database'

type Props = {
  basePath: string
  currentUserId: string
  conversations: Conversation[]
  selected: Conversation | null
  initialMessages: BookingMessage[]
  emptyText: string
}

function sessionLabel(c: Conversation): string {
  return `${formatDateHeading(c.date)} · ${c.start_time.slice(0, 5)}`
}

function ConversationList({
  basePath,
  currentUserId,
  conversations,
  selectedId,
}: {
  basePath: string
  currentUserId: string
  conversations: Conversation[]
  selectedId: string | null
}) {
  return (
    <ul className="space-y-1 p-2">
      {conversations.map((c) => {
        const isActive = c.id === selectedId
        const preview = c.lastMessage
          ? `${c.lastMessage.sender_id === currentUserId ? 'You: ' : ''}${c.lastMessage.body}`
          : 'No messages yet'
        return (
          <li key={c.id}>
            <Link
              href={`${basePath}?booking=${c.id}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'block rounded-2xl px-4 py-3 transition-colors',
                isActive ? 'bg-accent' : 'hover:bg-muted'
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium">{c.counterpartName}</span>
                {c.lastMessage && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatMessageTime(c.lastMessage.created_at)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {sessionLabel(c)}
                {c.status === 'cancelled' ? ' · Cancelled' : ''}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{preview}</p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function MessagesView({
  basePath,
  currentUserId,
  conversations,
  selected,
  initialMessages,
  emptyText,
}: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="size-5 text-muted-foreground" />
        </span>
        <p className="max-w-sm text-sm text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside
        aria-label="Conversations"
        className={cn(
          'rounded-3xl bg-card lg:max-h-[70dvh] lg:overflow-y-auto',
          selected && 'hidden lg:block'
        )}
      >
        <ConversationList
          basePath={basePath}
          currentUserId={currentUserId}
          conversations={conversations}
          selectedId={selected?.id ?? null}
        />
      </aside>

      {selected ? (
        <section
          aria-label={`Chat with ${selected.counterpartName}`}
          className="flex h-[70dvh] flex-col overflow-hidden rounded-3xl bg-card"
        >
          <header className="flex items-center gap-2 border-b px-2 py-3 sm:px-4">
            <Link
              href={basePath}
              aria-label="All conversations"
              className="flex size-11 items-center justify-center rounded-full hover:bg-muted lg:hidden"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div className="min-w-0 px-2">
              <h2 className="truncate font-semibold">{selected.counterpartName}</h2>
              <p className="text-xs text-muted-foreground">
                Session: {sessionLabel(selected)}
              </p>
            </div>
          </header>
          <ChatThread
            key={selected.id}
            bookingId={selected.id}
            currentUserId={currentUserId}
            canWrite={selected.canWrite}
            initialMessages={initialMessages}
          />
        </section>
      ) : (
        <div className="hidden items-center justify-center rounded-3xl bg-card p-10 text-sm text-muted-foreground lg:flex">
          Choose a conversation.
        </div>
      )}
    </div>
  )
}
